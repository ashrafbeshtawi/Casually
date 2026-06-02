package com.casually.app.widget

import android.content.Context
import android.content.Intent
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.*
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.*
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity as actionStartActivityIntent
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.color.ColorProvider
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.casually.app.MainActivity
import com.casually.app.data.SessionManager

// ── Shared Keys ──────────────────────────────────────────────────────────────

object WidgetKeys {
    val DataKey = stringPreferencesKey("widget_data")
    val TabKey = stringPreferencesKey("widget_tab")
    val IsLoadingKey = booleanPreferencesKey("widget_is_loading")
    fun collapseKey(projectId: String) = booleanPreferencesKey("collapsed_$projectId")
}

// ── Constants ────────────────────────────────────────────────────────────────

internal val PROTECTED_TITLES = setOf("One-Off Tasks", "Routines")

// ── Colours ──────────────────────────────────────────────────────────────────

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

private val SurfaceColor = ColorProvider(
    day = androidx.compose.ui.graphics.Color(WidgetSurfaceLight),
    night = androidx.compose.ui.graphics.Color(WidgetSurfaceDark),
)
private val OnSurfaceColor = ColorProvider(
    day = androidx.compose.ui.graphics.Color(WidgetOnSurfaceLight),
    night = androidx.compose.ui.graphics.Color(WidgetOnSurfaceDark),
)
private val MutedColor = ColorProvider(
    day = androidx.compose.ui.graphics.Color(WidgetMutedLight),
    night = androidx.compose.ui.graphics.Color(WidgetMutedDark),
)
private val PurpleColor = ColorProvider(
    day = androidx.compose.ui.graphics.Color(WidgetPurple),
    night = androidx.compose.ui.graphics.Color(WidgetPurpleLight),
)
private val WhiteColor = ColorProvider(
    day = androidx.compose.ui.graphics.Color.White,
    night = androidx.compose.ui.graphics.Color.White,
)
private val TabBgColor = ColorProvider(
    day = androidx.compose.ui.graphics.Color(WidgetTabBgLight),
    night = androidx.compose.ui.graphics.Color(WidgetTabBgDark),
)

// ── Widget ───────────────────────────────────────────────────────────────────

class CasuallyWidget : GlanceAppWidget() {

    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val isLoggedIn = SessionManager(context).isLoggedIn

        provideContent {
            // Everything the widget renders is driven by Glance Preferences.
            // Updates via updateAppWidgetState() + updateAll() are always
            // visible here — no stale-cache races.
            val prefs = currentState<Preferences>()
            val data = prefs[WidgetKeys.DataKey]?.let { WidgetDataProvider.deserialize(it) }
            val activeTab = prefs[WidgetKeys.TabKey] ?: "one-offs"
            val isLoading = prefs[WidgetKeys.IsLoadingKey] ?: false

            GlanceTheme {
                Column(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .background(SurfaceColor)
                        .padding(12.dp)
                        .cornerRadius(16.dp),
                ) {
                    // ── Header ───────────────────────────────────────────
                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "\u2705 Active Tasks",
                            style = TextStyle(
                                fontWeight = FontWeight.Bold,
                                color = OnSurfaceColor,
                                fontSize = 24.sp,
                            ),
                            modifier = GlanceModifier.defaultWeight(),
                        )
                        if (isLoggedIn) {
                            // Refresh button
                            Box(
                                modifier = GlanceModifier
                                    .cornerRadius(12.dp)
                                    .background(TabBgColor)
                                    .padding(horizontal = 14.dp, vertical = 6.dp)
                                    .clickable(actionRunCallback<WidgetRefreshCallback>()),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    if (isLoading) "\u23F3" else "\u21BB",
                                    style = TextStyle(
                                        color = OnSurfaceColor,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp,
                                    ),
                                )
                            }
                            Spacer(modifier = GlanceModifier.width(6.dp))
                            // Add button
                            Box(
                                modifier = GlanceModifier
                                    .cornerRadius(12.dp)
                                    .background(PurpleColor)
                                    .padding(horizontal = 20.dp, vertical = 6.dp)
                                    .clickable(
                                        actionStartActivityIntent(
                                            Intent(context, MainActivity::class.java).apply {
                                                putExtra("show_create_task", true)
                                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                            },
                                        )
                                    ),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "+ Add",
                                    style = TextStyle(
                                        color = WhiteColor,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp,
                                    ),
                                )
                            }
                        }
                    }

                    // ── Loading indicator ─────────────────────────────────
                    if (isLoading) {
                        Spacer(modifier = GlanceModifier.height(4.dp))
                        Text(
                            "Syncing\u2026",
                            style = TextStyle(
                                color = PurpleColor,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                            ),
                        )
                    }

                    Spacer(modifier = GlanceModifier.height(6.dp))

                    // ── Tab row ───────────────────────────────────────────
                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        listOf(
                            "one-offs" to "One-Offs",
                            "projects" to "Projects",
                            "routines" to "Routines",
                        ).forEach { (tabId, tabLabel) ->
                            val isSelected = tabId == activeTab
                            Box(
                                modifier = GlanceModifier
                                    .defaultWeight()
                                    .cornerRadius(10.dp)
                                    .background(if (isSelected) PurpleColor else TabBgColor)
                                    .padding(vertical = 6.dp)
                                    .clickable(
                                        actionRunCallback<WidgetTabCallback>(
                                            actionParametersOf(
                                                WidgetTabCallback.TabKey to tabId
                                            )
                                        )
                                    ),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    tabLabel,
                                    style = TextStyle(
                                        color = if (isSelected) WhiteColor else MutedColor,
                                        fontWeight = if (isSelected) FontWeight.Bold
                                        else FontWeight.Medium,
                                        fontSize = 14.sp,
                                    ),
                                )
                            }
                        }
                    }

                    Spacer(modifier = GlanceModifier.height(8.dp))

                    // ── Body ──────────────────────────────────────────────
                    when {
                        !isLoggedIn -> {
                            Box(
                                modifier = GlanceModifier
                                    .fillMaxWidth()
                                    .defaultWeight()
                                    .clickable(actionStartActivity<MainActivity>()),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "Sign in to view tasks",
                                    style = TextStyle(color = MutedColor),
                                )
                            }
                        }

                        data == null -> {
                            Box(
                                modifier = GlanceModifier
                                    .fillMaxWidth()
                                    .defaultWeight(),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "Tap \u21BB to load tasks",
                                    style = TextStyle(color = MutedColor),
                                )
                            }
                        }

                        else -> {
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
                                        style = TextStyle(color = MutedColor),
                                    )
                                }
                            } else {
                                LazyColumn {
                                    tabProjects.forEach { project ->
                                        val tasks =
                                            data.tasksByProject[project.id] ?: emptyList()
                                        val totalTasks = tasks.size
                                        val doneTasks = tasks.count { it.state == "DONE" }
                                        val isCollapsed =
                                            prefs[WidgetKeys.collapseKey(project.id)] ?: false

                                        item(itemId = project.id.hashCode().toLong()) {
                                            Column(
                                                modifier = GlanceModifier
                                                    .fillMaxWidth()
                                                    .padding(vertical = 4.dp),
                                            ) {
                                                // Project header
                                                val indicator =
                                                    if (isCollapsed) "\u25B6" else "\u25BC"
                                                Row(
                                                    modifier = GlanceModifier
                                                        .fillMaxWidth()
                                                        .clickable(
                                                            actionRunCallback<CollapseActionCallback>(
                                                                actionParametersOf(
                                                                    CollapseActionCallback.ProjectIdKey to project.id,
                                                                )
                                                            )
                                                        ),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                ) {
                                                    Text(
                                                        "$indicator ${project.emoji ?: ""} ${project.title}".trim(),
                                                        style = TextStyle(
                                                            fontWeight = FontWeight.Bold,
                                                            color = OnSurfaceColor,
                                                            fontSize = 22.sp,
                                                        ),
                                                        modifier = GlanceModifier.defaultWeight(),
                                                    )
                                                    if (totalTasks > 0) {
                                                        Box(
                                                            modifier = GlanceModifier
                                                                .cornerRadius(10.dp)
                                                                .background(PurpleColor)
                                                                .padding(
                                                                    horizontal = 7.dp,
                                                                    vertical = 3.dp
                                                                ),
                                                        ) {
                                                            Text(
                                                                "$doneTasks/$totalTasks",
                                                                style = TextStyle(
                                                                    color = WhiteColor,
                                                                    fontSize = 16.sp,
                                                                    fontWeight = FontWeight.Medium,
                                                                ),
                                                            )
                                                        }
                                                    }
                                                }

                                                // Tasks (when expanded)
                                                if (!isCollapsed) {
                                                    tasks.forEach { task ->
                                                        val displayName =
                                                            "${task.emoji ?: ""} ${task.title}".trim()
                                                        val pColor =
                                                            priorityColor(task.priority)
                                                        Row(
                                                            modifier = GlanceModifier
                                                                .fillMaxWidth()
                                                                .padding(
                                                                    start = 16.dp,
                                                                    top = 3.dp,
                                                                    bottom = 3.dp
                                                                )
                                                                .clickable(
                                                                    actionStartActivityIntent(
                                                                        Intent(
                                                                            context,
                                                                            WidgetStatePickerActivity::class.java
                                                                        ).apply {
                                                                            action =
                                                                                "STATE_PICK_${task.id}_short"
                                                                            putExtra(
                                                                                "item_id",
                                                                                task.id
                                                                            )
                                                                            putExtra(
                                                                                "item_type",
                                                                                "short"
                                                                            )
                                                                            putExtra(
                                                                                "current_state",
                                                                                task.state
                                                                                    ?: "ACTIVE"
                                                                            )
                                                                            putExtra(
                                                                                "item_name",
                                                                                displayName
                                                                            )
                                                                        },
                                                                    )
                                                                ),
                                                            verticalAlignment = Alignment.CenterVertically,
                                                        ) {
                                                            Box(
                                                                modifier = GlanceModifier
                                                                    .size(12.dp)
                                                                    .cornerRadius(6.dp)
                                                                    .background(
                                                                        ColorProvider(
                                                                            day = androidx.compose.ui.graphics.Color(
                                                                                pColor
                                                                            ),
                                                                            night = androidx.compose.ui.graphics.Color(
                                                                                pColor
                                                                            ),
                                                                        )
                                                                    ),
                                                            ) {}
                                                            Spacer(
                                                                modifier = GlanceModifier.width(
                                                                    8.dp
                                                                )
                                                            )
                                                            Text(
                                                                displayName,
                                                                style = TextStyle(
                                                                    color = MutedColor,
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
}

// ── Receiver ─────────────────────────────────────────────────────────────────

class CasuallyWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = CasuallyWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        WidgetRefreshWorker.refreshNow(context)
    }
}
