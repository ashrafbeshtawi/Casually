package com.casually.app.ui.activedashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.ShortRunningTask
import com.casually.app.ui.components.*
import com.casually.app.ui.theme.CasuallyPurple

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveDashboardScreen(
    onCreateTask: (parentId: String) -> Unit,
    onEditTask: (ShortRunningTask, String) -> Unit,
    refreshTrigger: Int = 0,
    viewModel: ActiveDashboardViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(refreshTrigger) {
        if (refreshTrigger > 0) viewModel.refresh()
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.silentRefresh()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    var moveDialogTarget by remember { mutableStateOf<Pair<String, String>?>(null) }
    var deleteConfirm by remember { mutableStateOf<Triple<String, String, String>?>(null) } // taskId, title, parentId

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
            val hasAnything = uiState.activeProjects.isNotEmpty() ||
                    uiState.oneOffTasks.isNotEmpty() ||
                    uiState.routineTasks.isNotEmpty()

            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(0.dp),
            ) {
                if (!hasAnything) {
                    item(key = "empty") {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                "No active items",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }

                // Active Projects section
                if (uiState.activeProjects.isNotEmpty()) {
                    item(key = "projects-header") {
                        Text(
                            "PROJECTS",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 8.dp, bottom = 4.dp),
                        )
                    }

                    uiState.activeProjects.forEach { project ->
                        val children = uiState.childrenByProject[project.id] ?: emptyList()

                        item(key = "project-${project.id}") {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                                    .drawBehind {
                                        drawLine(
                                            color = project.priority.color,
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
                                Column {
                                    Row(
                                        modifier = Modifier.padding(start = 12.dp, end = 12.dp, top = 10.dp, bottom = if (children.isEmpty()) 10.dp else 4.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        if (project.emoji != null) {
                                            Text(project.emoji, style = MaterialTheme.typography.titleMedium)
                                            Spacer(Modifier.width(6.dp))
                                        }
                                        Text(
                                            project.title,
                                            style = MaterialTheme.typography.titleSmall,
                                            modifier = Modifier.weight(1f),
                                        )
                                        if (children.isNotEmpty()) {
                                            Text(
                                                "${children.size} active",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                        IconButton(
                                            onClick = { onCreateTask(project.id) },
                                            modifier = Modifier.size(32.dp),
                                        ) {
                                            Icon(Icons.Default.Add, "Add task", Modifier.size(18.dp))
                                        }
                                    }
                                }
                            }
                        }

                        // Active children under each project
                        items(children, key = { it.id }) { task ->
                            TaskRow(
                                task = task,
                                onChangeState = { newState -> viewModel.changeTaskState(task.id, project.id, newState.name) },
                                onChangePriority = { newPriority -> viewModel.changeTaskPriority(task.id, project.id, newPriority.name) },
                                onEdit = { onEditTask(task, project.id) },
                                onDelete = { deleteConfirm = Triple(task.id, task.title, project.id) },
                                onMove = { moveDialogTarget = Pair(task.id, project.id) },
                            )
                        }
                    }
                }

                // One-Off Tasks section
                if (uiState.oneOffTasks.isNotEmpty()) {
                    item(key = "oneoffs-header") {
                        Text(
                            "ONE-OFF TASKS",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 16.dp, bottom = 4.dp),
                        )
                    }

                    items(uiState.oneOffTasks, key = { it.id }) { task ->
                        val parentId = uiState.oneOffProjectId ?: task.parentId
                        TaskRow(
                            task = task,
                            onChangeState = { newState -> viewModel.changeTaskState(task.id, parentId, newState.name) },
                            onChangePriority = { newPriority -> viewModel.changeTaskPriority(task.id, parentId, newPriority.name) },
                            onEdit = { onEditTask(task, parentId) },
                            onDelete = { deleteConfirm = Triple(task.id, task.title, parentId) },
                            onMove = { moveDialogTarget = Pair(task.id, parentId) },
                        )
                    }
                }

                // Routines section
                if (uiState.routineTasks.isNotEmpty()) {
                    item(key = "routines-header") {
                        Text(
                            "ROUTINES",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 16.dp, bottom = 4.dp),
                        )
                    }

                    items(uiState.routineTasks, key = { it.id }) { task ->
                        val parentId = uiState.routinesProjectId ?: task.parentId
                        TaskRow(
                            task = task,
                            onChangeState = { newState -> viewModel.changeTaskState(task.id, parentId, newState.name) },
                            onChangePriority = { newPriority -> viewModel.changeTaskPriority(task.id, parentId, newPriority.name) },
                            onEdit = { onEditTask(task, parentId) },
                            onDelete = { deleteConfirm = Triple(task.id, task.title, parentId) },
                            onMove = { moveDialogTarget = Pair(task.id, parentId) },
                        )
                    }
                }
            }
        }
    }

    // Move task dialog
    moveDialogTarget?.let { (taskId, currentParentId) ->
        MoveTaskDialog(
            projects = uiState.allProjects,
            currentParentId = currentParentId,
            onDismiss = { moveDialogTarget = null },
            onConfirm = { targetProjectId ->
                viewModel.moveTask(taskId, currentParentId, targetProjectId)
                moveDialogTarget = null
            },
        )
    }

    // Delete confirmation
    deleteConfirm?.let { (taskId, title, parentId) ->
        AlertDialog(
            onDismissRequest = { deleteConfirm = null },
            title = { Text("Delete task?") },
            text = { Text("\"$title\" will be permanently deleted.") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteTask(taskId, parentId)
                    deleteConfirm = null
                }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteConfirm = null }) { Text("Cancel") }
            },
        )
    }
}
