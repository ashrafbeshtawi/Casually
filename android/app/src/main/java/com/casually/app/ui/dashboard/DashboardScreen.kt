package com.casually.app.ui.dashboard

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
import androidx.compose.ui.graphics.Color
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
fun DashboardScreen(
    onCreateProject: () -> Unit,
    onCreateTask: (parentId: String) -> Unit,
    onEditProject: (LongRunningTask) -> Unit,
    onEditTask: (ShortRunningTask, String) -> Unit,
    refreshTrigger: Int = 0,
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    // Re-fetch when external actions (create/edit) bump the trigger
    LaunchedEffect(refreshTrigger) {
        if (refreshTrigger > 0) viewModel.refresh()
    }

    // Refresh data when app resumes from background
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

    // Dialogs
    var moveDialogTarget by remember { mutableStateOf<Pair<String, String>?>(null) }
    var deleteConfirm by remember { mutableStateOf<Triple<String, String, Boolean>?>(null) }
    var deleteProjectId by remember { mutableStateOf("") }

    val filtered = if (uiState.projectStateFilter == "ALL") {
        uiState.projects
    } else {
        uiState.projects.filter { it.state.name == uiState.projectStateFilter }
    }

    Box {
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
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(0.dp),
                ) {
                    // Two filter rows
                    item(key = "filters") {
                        Column(
                            modifier = Modifier.padding(bottom = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            FilterChipRow(
                                label = "Projects:",
                                selectedValue = uiState.projectStateFilter,
                                options = DEFAULT_FILTER_OPTIONS,
                                onSelect = { viewModel.setProjectFilter(it) },
                            )
                            FilterChipRow(
                                label = "Tasks:",
                                selectedValue = uiState.taskStateFilter,
                                options = DEFAULT_FILTER_OPTIONS,
                                onSelect = { viewModel.setTaskFilter(it) },
                            )
                        }
                    }

                    if (filtered.isEmpty()) {
                        item(key = "empty") {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    if (uiState.projectStateFilter == "ALL") "No projects yet"
                                    else "No ${uiState.projectStateFilter.lowercase()} projects",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }

                    // Project sections
                    filtered.forEach { project ->
                        val isExpanded = uiState.expandedProjects.contains(project.id)
                        val isProtected = project.title in PROTECTED_TITLES
                        val childCount = project.count?.children ?: 0
                        val allChildren = uiState.childrenByProject[project.id] ?: emptyList()
                        val isLoadingChildren = uiState.loadingChildren.contains(project.id)

                        val filteredChildren = if (uiState.taskStateFilter == "ALL") {
                            allChildren
                        } else {
                            allChildren.filter { it.state.name == uiState.taskStateFilter }
                        }

                        // Project header
                        item(key = "project-${project.id}") {
                            ProjectHeader(
                                project = project,
                                isExpanded = isExpanded,
                                childCount = childCount,
                                isProtected = isProtected,
                                onToggle = { viewModel.toggleProject(project.id) },
                                onAddTask = { onCreateTask(project.id) },
                                onChangeState = { newState -> viewModel.changeProjectState(project.id, newState.name) },
                                onChangePriority = { newPriority -> viewModel.changeProjectPriority(project.id, newPriority.name) },
                                onEdit = { onEditProject(project) },
                                onDelete = { deleteConfirm = Triple(project.id, project.title, true) },
                            )
                        }

                        // Expanded children
                        if (isExpanded) {
                            if (isLoadingChildren) {
                                item(key = "loading-${project.id}") {
                                    LinearProgressIndicator(
                                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                                        color = CasuallyPurple,
                                    )
                                }
                            } else {
                                items(filteredChildren, key = { it.id }) { task ->
                                    TaskRow(
                                        task = task,
                                        modifier = Modifier.animateItem(),
                                        onChangeState = { newState -> viewModel.changeTaskState(task.id, project.id, newState.name) },
                                        onChangePriority = { newPriority -> viewModel.changeTaskPriority(task.id, project.id, newPriority.name) },
                                        onEdit = { onEditTask(task, project.id) },
                                        onDelete = {
                                            deleteProjectId = project.id
                                            deleteConfirm = Triple(task.id, task.title, false)
                                        },
                                        onMove = { moveDialogTarget = Pair(task.id, project.id) },
                                    )
                                }

                                if (filteredChildren.isEmpty()) {
                                    item(key = "empty-${project.id}") {
                                        Text(
                                            if (uiState.taskStateFilter == "ALL") "No tasks yet"
                                            else "No ${uiState.taskStateFilter.lowercase()} tasks",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.padding(start = 40.dp, top = 4.dp, bottom = 12.dp),
                                        )
                                    }
                                }
                            }

                            item(key = "spacer-${project.id}") {
                                Spacer(Modifier.height(8.dp))
                            }
                        }
                    }
                }
            }
        }

        // FAB
        FloatingActionButton(
            onClick = onCreateProject,
            containerColor = CasuallyPurple,
            contentColor = Color.White,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
        ) {
            Icon(Icons.Default.Add, "Create project")
        }
    }

    // Move task dialog
    moveDialogTarget?.let { (taskId, currentParentId) ->
        MoveTaskDialog(
            projects = uiState.projects,
            currentParentId = currentParentId,
            onDismiss = { moveDialogTarget = null },
            onConfirm = { targetProjectId ->
                viewModel.moveTask(taskId, currentParentId, targetProjectId)
                moveDialogTarget = null
            },
        )
    }

    // Delete confirmation
    deleteConfirm?.let { (id, title, isProject) ->
        AlertDialog(
            onDismissRequest = { deleteConfirm = null },
            title = { Text("Delete ${if (isProject) "project" else "task"}?") },
            text = { Text("\"$title\" will be permanently deleted.") },
            confirmButton = {
                TextButton(onClick = {
                    if (isProject) viewModel.deleteProject(id)
                    else viewModel.deleteTask(id, deleteProjectId)
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
