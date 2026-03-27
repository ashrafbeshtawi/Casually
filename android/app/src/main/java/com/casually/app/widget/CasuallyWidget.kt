package com.casually.app.widget

import android.content.Context
import android.content.Intent
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.*
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.*
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.appwidget.action.actionRunCallback
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
private val WidgetTabBgLight = android.graphics.Color.parseColor("#E8E6F0")
private val WidgetTabBgDark = android.graphics.Color.parseColor("#2B2930")

// Priority colors
private val PrioHighest = android.graphics.Color.parseColor("#EF4444")
private val PrioHigh = android.graphics.Color.parseColor("#F97316")
private val PrioMedium = android.graphics.Color.parseColor("#EAB308")
private val PrioLow = android.graphics.Color.parseColor("#3B82F6")
private val PrioLowest = android.graphics.Color.parseColor("#22C55E")

private fun priorityColor(priority: String?): Int = when (priority) {
    "HIGHEST" -> PrioHighest
    "HIGH" -> PrioHigh
    "MEDIUM" -> PrioMedium
    "LOW" -> PrioLow
    "LOWEST" -> PrioLowest
    else -> PrioMedium
}

private val PROTECTED_TITLES = listOf("One-Off Tasks", "Routines")

val WidgetTabKey = stringPreferencesKey("widget_tab")

class CasuallyWidget : GlanceAppWidget() {

    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val sessionManager = SessionManager(context)
        val provider = WidgetDataProvider(context)

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

        // Seed Glance state with server collapse values for any projects not yet tracked
        if (data != null) {
            updateAppWidgetState(context, id) { prefs ->
                for (project in data.projects) {
                    val key = CollapseActionCallback.collapseKey(project.id)
                    if (key !in prefs) {
                        prefs[key] = project.collapsed == true
                    }
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
        val tabBgColor = ColorProvider(
            day = androidx.compose.ui.graphics.Color(WidgetTabBgLight),
            night = androidx.compose.ui.graphics.Color(WidgetTabBgDark),
        )

        provideContent {
            val glancePrefs = currentState<Preferences>()
            val activeTab = glancePrefs[WidgetTabKey] ?: "one-offs"

            GlanceTheme {
                Column(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .background(surfaceColor)
                        .padding(12.dp)
                        .cornerRadius(16.dp),
                ) {
                    // Header row: title + "+" button
                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "\u2705 Active Tasks",
                            style = TextStyle(
                                fontWeight = FontWeight.Bold,
                                color = onSurfaceColor,
                                fontSize = 24.sp,
                            ),
                            modifier = GlanceModifier.defaultWeight(),
                        )
                        if (sessionManager.isLoggedIn) {
                            Box(
                                modifier = GlanceModifier
                                    .cornerRadius(12.dp)
                                    .background(purpleColor)
                                    .padding(horizontal = 20.dp, vertical = 6.dp)
                                    .clickable(actionStartActivityIntent(
                                        Intent(context, MainActivity::class.java).apply {
                                            putExtra("show_create_task", true)
                                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                        },
                                    )),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "+ Add",
                                    style = TextStyle(
                                        color = whiteColor,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp,
                                    ),
                                )
                            }
                        }
                    }

                    Spacer(modifier = GlanceModifier.height(6.dp))

                    // Tab row
                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        listOf("one-offs" to "One-Offs", "projects" to "Projects", "routines" to "Routines").forEach { (tabId, tabLabel) ->
                            val isSelected = tabId == activeTab
                            Box(
                                modifier = GlanceModifier
                                    .defaultWeight()
                                    .cornerRadius(10.dp)
                                    .background(if (isSelected) purpleColor else tabBgColor)
                                    .padding(vertical = 6.dp)
                                    .clickable(actionRunCallback<WidgetTabCallback>(
                                        actionParametersOf(WidgetTabCallback.TabKey to tabId)
                                    )),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    tabLabel,
                                    style = TextStyle(
                                        color = if (isSelected) whiteColor else mutedColor,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        fontSize = 14.sp,
                                    ),
                                )
                            }
                        }
                    }

                    Spacer(modifier = GlanceModifier.height(8.dp))

                    if (!sessionManager.isLoggedIn) {
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
                        // Filter projects by tab
                        val tabProjects = data.projects.filter { project ->
                            when (activeTab) {
                                "one-offs" -> project.title == "One-Off Tasks"
                                "routines" -> project.title == "Routines"
                                else -> project.title !in PROTECTED_TITLES
                            }
                        }

                        if (tabProjects.isEmpty()) {
                            Box(
                                modifier = GlanceModifier
                                    .fillMaxWidth()
                                    .defaultWeight(),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "No active items",
                                    style = TextStyle(color = mutedColor),
                                )
                            }
                        } else {
                            LazyColumn {
                                tabProjects.forEach { project ->
                                    val tasks = data.tasksByProject[project.id] ?: emptyList()
                                    val totalTasks = tasks.size
                                    val doneTasks = tasks.count { it.state == "DONE" }

                                    item(itemId = project.id.hashCode().toLong()) {
                                        Column(
                                            modifier = GlanceModifier
                                                .fillMaxWidth()
                                                .padding(vertical = 4.dp),
                                        ) {
                                            val isCollapsed = glancePrefs[CollapseActionCallback.collapseKey(project.id)] ?: false
                                            val collapseIndicator = if (isCollapsed) "\u25B6" else "\u25BC"

                                            Row(
                                                modifier = GlanceModifier
                                                    .fillMaxWidth()
                                                    .clickable(actionRunCallback<CollapseActionCallback>(
                                                        actionParametersOf(
                                                            CollapseActionCallback.ProjectIdKey to project.id,
                                                        )
                                                    )),
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                Text(
                                                    "$collapseIndicator ${project.emoji ?: ""} ${project.title}".trim(),
                                                    style = TextStyle(
                                                        fontWeight = FontWeight.Bold,
                                                        color = onSurfaceColor,
                                                        fontSize = 22.sp,
                                                    ),
                                                    modifier = GlanceModifier.defaultWeight(),
                                                )
                                                if (totalTasks > 0) {
                                                    Box(
                                                        modifier = GlanceModifier
                                                            .cornerRadius(10.dp)
                                                            .background(purpleColor)
                                                            .padding(horizontal = 7.dp, vertical = 3.dp),
                                                    ) {
                                                        Text(
                                                            "$doneTasks/$totalTasks",
                                                            style = TextStyle(
                                                                color = whiteColor,
                                                                fontSize = 16.sp,
                                                                fontWeight = FontWeight.Medium,
                                                            ),
                                                        )
                                                    }
                                                }
                                            }

                                            if (!isCollapsed) {
                                                tasks.forEach { task ->
                                                    val taskDisplayName = "${task.emoji ?: ""} ${task.title}".trim()
                                                    val pColor = priorityColor(task.priority)
                                                    Row(
                                                        modifier = GlanceModifier
                                                            .fillMaxWidth()
                                                            .padding(start = 16.dp, top = 3.dp, bottom = 3.dp)
                                                            .clickable(actionStartActivityIntent(
                                                                Intent(context, WidgetStatePickerActivity::class.java).apply {
                                                                    action = "STATE_PICK_${task.id}_short"
                                                                    putExtra("item_id", task.id)
                                                                    putExtra("item_type", "short")
                                                                    putExtra("current_state", task.state ?: "ACTIVE")
                                                                    putExtra("item_name", taskDisplayName)
                                                                },
                                                            )),
                                                        verticalAlignment = Alignment.CenterVertically,
                                                    ) {
                                                        Box(
                                                            modifier = GlanceModifier
                                                                .size(12.dp)
                                                                .cornerRadius(6.dp)
                                                                .background(ColorProvider(
                                                                    day = androidx.compose.ui.graphics.Color(pColor),
                                                                    night = androidx.compose.ui.graphics.Color(pColor),
                                                                )),
                                                        ) {}
                                                        Spacer(modifier = GlanceModifier.width(8.dp))
                                                        Text(
                                                            taskDisplayName,
                                                            style = TextStyle(
                                                                color = mutedColor,
                                                                fontSize = 18.sp,
                                                            ),
                                                            maxLines = 1,
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
    }
}

class CasuallyWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = CasuallyWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        WidgetRefreshWorker.refreshNow(context)
    }
}
