package com.casually.app.widget

import android.content.Context
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.*
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.color.ColorProvider
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
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
        val data = provider.loadFromCache()

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

        provideContent {
            GlanceTheme {
                Column(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .background(surfaceColor)
                        .padding(12.dp)
                        .cornerRadius(16.dp),
                ) {
                    // Branded header
                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "Casually",
                            style = TextStyle(
                                fontWeight = FontWeight.Bold,
                                color = onSurfaceColor,
                                fontSize = 16.sp,
                            ),
                            modifier = GlanceModifier.defaultWeight(),
                        )
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
                                            .padding(vertical = 4.dp)
                                            .clickable(actionStartActivity<MainActivity>()),
                                    ) {
                                        // Project header row
                                        Row(
                                            modifier = GlanceModifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Text(
                                                "${project.emoji ?: ""} ${project.title}".trim(),
                                                style = TextStyle(
                                                    fontWeight = FontWeight.Bold,
                                                    color = onSurfaceColor,
                                                ),
                                                modifier = GlanceModifier.defaultWeight(),
                                            )
                                            if (totalTasks > 0) {
                                                // Task count badge
                                                Box(
                                                    modifier = GlanceModifier
                                                        .cornerRadius(10.dp)
                                                        .background(purpleColor)
                                                        .padding(horizontal = 6.dp, vertical = 2.dp),
                                                ) {
                                                    Text(
                                                        "$doneTasks/$totalTasks",
                                                        style = TextStyle(
                                                            color = ColorProvider(
                                                                day = androidx.compose.ui.graphics.Color.White,
                                                                night = androidx.compose.ui.graphics.Color.White,
                                                            ),
                                                            fontSize = 11.sp,
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
                                                    .padding(start = 16.dp, top = 2.dp, bottom = 2.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
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
                                                        fontSize = 13.sp,
                                                    ),
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
}
