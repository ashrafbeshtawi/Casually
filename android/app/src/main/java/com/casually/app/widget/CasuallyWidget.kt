package com.casually.app.widget

import android.content.Context
import android.content.Intent
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.*
import androidx.glance.appwidget.action.actionStartActivity as actionStartActivityIntent
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.color.ColorProvider
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.casually.app.BuildConfig
import com.casually.app.MainActivity
import com.casually.app.data.SessionManager

// Brand colors for widget
private val WidgetPurple = android.graphics.Color.parseColor("#6D5FF5")
private val WidgetPurpleLight = android.graphics.Color.parseColor("#8B80F8")
private val WidgetSurfaceLight = android.graphics.Color.parseColor("#F8F7FC")
private val WidgetSurfaceDark = android.graphics.Color.parseColor("#1C1B1F")
private val WidgetOnSurfaceLight = android.graphics.Color.parseColor("#1C1B1F")
private val WidgetOnSurfaceDark = android.graphics.Color.parseColor("#E6E1E5")
private val WidgetMutedLight = android.graphics.Color.parseColor("#49454F")
private val WidgetMutedDark = android.graphics.Color.parseColor("#CAC4D0")

// State badge colors
private val StateActive = android.graphics.Color.parseColor("#22C55E")
private val StateWaiting = android.graphics.Color.parseColor("#EAB308")
private val StateBlocked = android.graphics.Color.parseColor("#EF4444")
private val StateDone = android.graphics.Color.parseColor("#6B7280")

private fun stateColor(state: String?): Int = when (state) {
    "ACTIVE" -> StateActive
    "WAITING" -> StateWaiting
    "BLOCKED" -> StateBlocked
    "DONE" -> StateDone
    else -> StateActive
}

private fun stateLabel(state: String?): String = when (state) {
    "ACTIVE" -> "Active"
    "WAITING" -> "Wait"
    "BLOCKED" -> "Block"
    "DONE" -> "Done"
    else -> "Active"
}

// Priority colors
private val PriorityHighest = android.graphics.Color.parseColor("#EF4444")
private val PriorityHigh = android.graphics.Color.parseColor("#F97316")
private val PriorityMedium = android.graphics.Color.parseColor("#EAB308")
private val PriorityLow = android.graphics.Color.parseColor("#3B82F6")
private val PriorityLowest = android.graphics.Color.parseColor("#22C55E")

private fun priorityColor(priority: String?): Int = when (priority) {
    "HIGHEST" -> PriorityHighest
    "HIGH" -> PriorityHigh
    "MEDIUM" -> PriorityMedium
    "LOW" -> PriorityLow
    "LOWEST" -> PriorityLowest
    else -> PriorityMedium
}

class CasuallyWidget : GlanceAppWidget() {

    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val sessionManager = SessionManager(context)
        val provider = WidgetDataProvider(context)

        // Try cache first; if empty and logged in, fetch fresh data inline
        var data = provider.loadFromCache()
        if (data == null && sessionManager.isLoggedIn) {
            val token = sessionManager.sessionToken
            if (token != null) {
                data = provider.fetchData(BuildConfig.API_BASE_URL, token)
                if (data != null) {
                    provider.saveToCache(data)
                }
            }
        }

        val surfaceColor = ColorProvider(
            day = androidx.compose.ui.graphics.Color(WidgetSurfaceLight),
            night = androidx.compose.ui.graphics.Color(WidgetSurfaceDark),
        )
        val onSurfaceColor = ColorProvider(
            day = androidx.compose.ui.graphics.Color(WidgetOnSurfaceLight),
            night = androidx.compose.ui.graphics.Color(WidgetOnSurfaceDark),
        )
        val mutedColor = ColorProvider(
            day = androidx.compose.ui.graphics.Color(WidgetMutedLight),
            night = androidx.compose.ui.graphics.Color(WidgetMutedDark),
        )
        val purpleColor = ColorProvider(
            day = androidx.compose.ui.graphics.Color(WidgetPurple),
            night = androidx.compose.ui.graphics.Color(WidgetPurpleLight),
        )
        val whiteColor = ColorProvider(
            day = androidx.compose.ui.graphics.Color.White,
            night = androidx.compose.ui.graphics.Color.White,
        )

        provideContent {
            GlanceTheme {
                Column(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .background(surfaceColor)
                        .padding(12.dp)
                        .cornerRadius(16.dp),
                ) {
                    // Branded header with "+" button
                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "Casually",
                            style = TextStyle(
                                fontWeight = FontWeight.Bold,
                                color = onSurfaceColor,
                                fontSize = 18.sp,
                            ),
                            modifier = GlanceModifier.defaultWeight(),
                        )
                        if (sessionManager.isLoggedIn) {
                            Box(
                                modifier = GlanceModifier
                                    .cornerRadius(12.dp)
                                    .background(purpleColor)
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                                    .clickable(actionStartActivity<MainActivity>()),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "+",
                                    style = TextStyle(
                                        color = whiteColor,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp,
                                    ),
                                )
                            }
                        }
                    }

                    // Purple accent bar
                    Spacer(modifier = GlanceModifier.height(6.dp))
                    Box(
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .height(3.dp)
                            .cornerRadius(2.dp)
                            .background(purpleColor),
                    ) {}

                    Spacer(modifier = GlanceModifier.height(8.dp))

                    if (!sessionManager.isLoggedIn) {
                        // Sign-in state
                        Box(
                            modifier = GlanceModifier
                                .fillMaxWidth()
                                .defaultWeight()
                                .clickable(actionStartActivity<MainActivity>()),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                "Sign in to view tasks",
                                style = TextStyle(color = mutedColor),
                            )
                        }
                    } else if (data == null || data.projects.isEmpty()) {
                        // Empty state
                        Box(
                            modifier = GlanceModifier
                                .fillMaxWidth()
                                .defaultWeight()
                                .clickable(actionStartActivity<MainActivity>()),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                "No active projects",
                                style = TextStyle(color = mutedColor),
                            )
                        }
                    } else {
                        LazyColumn {
                            data.projects.forEach { project ->
                                val tasks = data.tasksByProject[project.id] ?: emptyList()
                                val totalTasks = tasks.size
                                val doneTasks = tasks.count { it.state == "DONE" }

                                item(itemId = project.id.hashCode().toLong()) {
                                    Column(
                                        modifier = GlanceModifier
                                            .fillMaxWidth()
                                            .padding(vertical = 4.dp),
                                    ) {
                                        // Project header row
                                        Row(
                                            modifier = GlanceModifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            // Tappable state badge for project
                                            val projColor = stateColor(project.state)
                                            Box(
                                                modifier = GlanceModifier
                                                    .cornerRadius(8.dp)
                                                    .background(ColorProvider(
                                                        day = androidx.compose.ui.graphics.Color(projColor),
                                                        night = androidx.compose.ui.graphics.Color(projColor),
                                                    ))
                                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                                    .clickable(actionStartActivityIntent(
                                                        Intent(context, WidgetStatePickerActivity::class.java).apply {
                                                            action = "STATE_PICK_${project.id}_long"
                                                            putExtra("item_id", project.id)
                                                            putExtra("item_type", "long")
                                                            putExtra("current_state", project.state ?: "ACTIVE")
                                                        },
                                                    )),
                                                contentAlignment = Alignment.Center,
                                            ) {
                                                Text(
                                                    stateLabel(project.state),
                                                    style = TextStyle(
                                                        color = whiteColor,
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.Medium,
                                                    ),
                                                )
                                            }
                                            Spacer(modifier = GlanceModifier.width(6.dp))
                                            Text(
                                                "${project.emoji ?: ""} ${project.title}".trim(),
                                                style = TextStyle(
                                                    fontWeight = FontWeight.Bold,
                                                    color = onSurfaceColor,
                                                    fontSize = 16.sp,
                                                ),
                                                modifier = GlanceModifier
                                                    .defaultWeight()
                                                    .clickable(actionStartActivity<MainActivity>()),
                                            )
                                            if (totalTasks > 0) {
                                                Box(
                                                    modifier = GlanceModifier
                                                        .cornerRadius(10.dp)
                                                        .background(purpleColor)
                                                        .padding(horizontal = 6.dp, vertical = 2.dp),
                                                ) {
                                                    Text(
                                                        "$doneTasks/$totalTasks",
                                                        style = TextStyle(
                                                            color = whiteColor,
                                                            fontSize = 13.sp,
                                                            fontWeight = FontWeight.Medium,
                                                        ),
                                                    )
                                                }
                                            }
                                        }

                                        // Tasks under this project
                                        tasks.forEach { task ->
                                            Row(
                                                modifier = GlanceModifier
                                                    .fillMaxWidth()
                                                    .padding(start = 16.dp, top = 3.dp, bottom = 3.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                // Tappable state badge for task
                                                val taskColor = stateColor(task.state)
                                                Box(
                                                    modifier = GlanceModifier
                                                        .cornerRadius(6.dp)
                                                        .background(ColorProvider(
                                                            day = androidx.compose.ui.graphics.Color(taskColor),
                                                            night = androidx.compose.ui.graphics.Color(taskColor),
                                                        ))
                                                        .padding(horizontal = 5.dp, vertical = 2.dp)
                                                        .clickable(actionStartActivityIntent(
                                                            Intent(context, WidgetStatePickerActivity::class.java).apply {
                                                                action = "STATE_PICK_${task.id}_short"
                                                                putExtra("item_id", task.id)
                                                                putExtra("item_type", "short")
                                                                putExtra("current_state", task.state ?: "ACTIVE")
                                                            },
                                                        )),
                                                    contentAlignment = Alignment.Center,
                                                ) {
                                                    Text(
                                                        stateLabel(task.state),
                                                        style = TextStyle(
                                                            color = whiteColor,
                                                            fontSize = 11.sp,
                                                            fontWeight = FontWeight.Medium,
                                                        ),
                                                    )
                                                }
                                                Spacer(modifier = GlanceModifier.width(6.dp))
                                                // Priority dot
                                                val dotColor = priorityColor(task.priority)
                                                Box(
                                                    modifier = GlanceModifier
                                                        .size(8.dp)
                                                        .cornerRadius(4.dp)
                                                        .background(ColorProvider(
                                                            day = androidx.compose.ui.graphics.Color(dotColor),
                                                            night = androidx.compose.ui.graphics.Color(dotColor),
                                                        )),
                                                ) {}
                                                Spacer(modifier = GlanceModifier.width(6.dp))
                                                Text(
                                                    "${task.emoji ?: ""} ${task.title}".trim(),
                                                    style = TextStyle(
                                                        color = mutedColor,
                                                        fontSize = 15.sp,
                                                    ),
                                                    modifier = GlanceModifier
                                                        .defaultWeight()
                                                        .clickable(actionStartActivity<MainActivity>()),
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

class CasuallyWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = CasuallyWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        WidgetRefreshWorker.refreshNow(context)
    }
}
