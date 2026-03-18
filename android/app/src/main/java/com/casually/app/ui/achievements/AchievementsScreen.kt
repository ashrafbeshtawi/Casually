package com.casually.app.ui.achievements

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.casually.app.domain.model.Priority
import com.casually.app.domain.model.ShortRunningTask
import com.casually.app.ui.components.*

private data class AchievementGroup(
    val id: String,
    val title: String,
    val emoji: String?,
    val priority: Priority,
    val tasks: List<ShortRunningTask>,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AchievementsScreen(
    viewModel: AchievementsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var expandedProjects by remember { mutableStateOf<Set<String>>(emptySet()) }

    when {
        uiState.error != null -> ErrorScreen(
            message = uiState.error!!,
            onRetry = { viewModel.refresh() },
        )
        uiState.isLoading -> LoadingScreen()
        else -> PullToRefreshBox(
            isRefreshing = false,
            onRefresh = { viewModel.refresh() },
        ) {
            val hasAnything = uiState.doneProjects.isNotEmpty() || uiState.tasksByProject.isNotEmpty()

            // Merge both types into a single list of groups
            val groups = buildList {
                uiState.doneProjects.forEach { project ->
                    add(AchievementGroup(
                        id = project.id,
                        title = project.title,
                        emoji = project.emoji,
                        priority = project.priority,
                        tasks = uiState.childrenByProject[project.id] ?: emptyList(),
                    ))
                }
                uiState.tasksByProject.forEach { group ->
                    add(AchievementGroup(
                        id = "group-${group.projectId}",
                        title = group.projectTitle,
                        emoji = group.projectEmoji,
                        priority = group.tasks.firstOrNull()?.priority ?: Priority.MEDIUM,
                        tasks = group.tasks,
                    ))
                }
            }

            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(0.dp),
            ) {
                if (!hasAnything) {
                    item(key = "empty") {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Icon(
                                Icons.Default.EmojiEvents,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "No completed tasks yet",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                "Start checking things off!",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }

                groups.forEach { group ->
                    val isExpanded = expandedProjects.contains(group.id)

                    item(key = "group-${group.id}") {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .drawBehind {
                                    drawLine(
                                        color = group.priority.color,
                                        start = Offset(0f, 0f),
                                        end = Offset(0f, size.height),
                                        strokeWidth = 8f,
                                    )
                                },
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                            ),
                            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                        ) {
                            Column(modifier = Modifier.animateContentSize()) {
                                Row(
                                    modifier = Modifier
                                        .clickable {
                                            expandedProjects = if (isExpanded)
                                                expandedProjects - group.id
                                            else
                                                expandedProjects + group.id
                                        }
                                        .padding(
                                            start = 12.dp, end = 12.dp,
                                            top = 10.dp, bottom = 10.dp,
                                        ),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(
                                        if (isExpanded) Icons.Default.KeyboardArrowDown
                                        else Icons.Default.KeyboardArrowRight,
                                        contentDescription = if (isExpanded) "Collapse" else "Expand",
                                        modifier = Modifier.size(20.dp),
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Spacer(Modifier.width(4.dp))
                                    if (group.emoji != null) {
                                        Text(group.emoji, style = MaterialTheme.typography.titleMedium)
                                        Spacer(Modifier.width(6.dp))
                                    }
                                    Text(
                                        group.title,
                                        style = MaterialTheme.typography.titleSmall,
                                        modifier = Modifier.weight(1f),
                                    )
                                    if (group.tasks.isNotEmpty()) {
                                        Text(
                                            "${group.tasks.size} done",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (isExpanded) {
                        items(group.tasks, key = { it.id }) { task ->
                            TaskRow(task = task, minimal = true)
                        }
                    }
                }
            }
        }
    }
}
