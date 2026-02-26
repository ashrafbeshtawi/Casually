package com.casually.app.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.*
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.*
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.casually.app.MainActivity
import com.casually.app.data.SessionManager

class CasuallyWidget : GlanceAppWidget() {

    override val sizeMode = SizeMode.Exact

    @Composable
    override fun Content() {
        val context = LocalContext.current
        val sessionManager = SessionManager(context)
        val provider = WidgetDataProvider(context)
        val data = provider.loadFromCache()

        GlanceTheme {
            Column(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(GlanceTheme.colors.surface)
                    .padding(12.dp)
                    .cornerRadius(16.dp),
            ) {
                // Header
                Row(
                    modifier = GlanceModifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Casually",
                        style = TextStyle(
                            fontWeight = FontWeight.Bold,
                            color = GlanceTheme.colors.onSurface,
                        ),
                        modifier = GlanceModifier.defaultWeight(),
                    )
                }

                Spacer(modifier = GlanceModifier.height(8.dp))

                if (!sessionManager.isLoggedIn) {
                    Text(
                        "Sign in to Casually",
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .clickable(actionStartActivity<MainActivity>()),
                    )
                } else if (data == null || data.projects.isEmpty()) {
                    Text(
                        "No active projects",
                        style = TextStyle(color = GlanceTheme.colors.onSurfaceVariant),
                    )
                } else {
                    LazyColumn {
                        data.projects.forEach { project ->
                            item(itemId = project.id.hashCode().toLong()) {
                                Column(modifier = GlanceModifier.fillMaxWidth().padding(vertical = 4.dp)) {
                                    // Project header
                                    Row(
                                        modifier = GlanceModifier
                                            .fillMaxWidth()
                                            .clickable(actionStartActivity<MainActivity>()),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            "${project.emoji ?: ""} ${project.title}",
                                            style = TextStyle(
                                                fontWeight = FontWeight.Medium,
                                                color = GlanceTheme.colors.onSurface,
                                            ),
                                        )
                                    }

                                    // Tasks under this project
                                    val tasks = data.tasksByProject[project.id] ?: emptyList()
                                    tasks.forEach { task ->
                                        Row(
                                            modifier = GlanceModifier
                                                .fillMaxWidth()
                                                .padding(start = 16.dp, top = 2.dp, bottom = 2.dp)
                                                .clickable(actionStartActivity<MainActivity>()),
                                        ) {
                                            Text(
                                                "${task.emoji ?: "  "} ${task.title}",
                                                style = TextStyle(
                                                    color = GlanceTheme.colors.onSurfaceVariant,
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

class CasuallyWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = CasuallyWidget()
}
