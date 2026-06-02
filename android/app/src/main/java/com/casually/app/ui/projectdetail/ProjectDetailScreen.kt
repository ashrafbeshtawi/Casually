package com.casually.app.ui.projectdetail

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.casually.app.domain.model.Priority
import com.casually.app.domain.model.ShortRunningTask
import com.casually.app.domain.model.TaskState
import com.casually.app.domain.model.sortedByPriority
import com.casually.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectDetailScreen(
    onBack: () -> Unit,
    onAddTask: (String) -> Unit,
    onEditTask: (ShortRunningTask, String) -> Unit,
    refreshTrigger: Int = 0,
    viewModel: ProjectDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var stateFilter by remember { mutableStateOf("ACTIVE") }
    var moveDialogTarget by remember { mutableStateOf<String?>(null) }
    var deleteConfirm by remember { mutableStateOf<Pair<String, String>?>(null) }

    LaunchedEffect(refreshTrigger) {
        if (refreshTrigger > 0) viewModel.refresh()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    val project = uiState.project
                    if (project != null) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (project.emoji != null) {
                                Text(project.emoji)
                                Spacer(Modifier.width(8.dp))
                            }
                            Text(project.title)
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
            )
        },
        floatingActionButton = {
            val project = uiState.project
            if (project != null && project.state != TaskState.BLOCKED && project.state != TaskState.DONE) {
                FloatingActionButton(onClick = { onAddTask(project.id) }) {
                    Icon(Icons.Default.Add, "Add task")
                }
            }
        }
    ) { padding ->
        when {
            uiState.error != null -> ErrorScreen(
                message = uiState.error!!,
                onRetry = { viewModel.refresh() },
                modifier = Modifier.padding(padding),
            )
            uiState.isLoading -> LoadingScreen(modifier = Modifier.padding(padding))
            uiState.project != null -> PullToRefreshBox(
                isRefreshing = false,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.padding(padding),
            ) {
                val project = uiState.project!!
                val isProtected = project.title in PROTECTED_TITLES
                val allChildren = project.children ?: emptyList()
                val filteredChildren = if (stateFilter == "ALL") allChildren
                    else allChildren.filter { it.state.name == stateFilter }
                val sortedChildren = filteredChildren.sortedByPriority { it.priority }

                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    // Project header
                    item(key = "header") {
                        Column {
                            if (project.description != null) {
                                Text(
                                    project.description,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Spacer(Modifier.height(8.dp))
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                ProjectStateChanger(
                                    state = project.state,
                                    enabled = !isProtected,
                                    onChange = { viewModel.changeProjectState(it.name) },
                                )
                                Spacer(Modifier.width(8.dp))
                                ProjectPriorityChanger(
                                    priority = project.priority,
                                    enabled = !isProtected,
                                    onChange = { viewModel.changeProjectPriority(it.name) },
                                )
                            }
                            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                            Text(
                                "${allChildren.size} tasks",
                                style = MaterialTheme.typography.titleSmall,
                            )
                        }
                    }

                    // Filter chips
                    item(key = "filters") {
                        FilterChipRow(
                            label = "Tasks:",
                            selectedValue = stateFilter,
                            options = DEFAULT_FILTER_OPTIONS,
                            onSelect = { stateFilter = it },
                        )
                    }

                    // Child tasks sorted by priority
                    items(sortedChildren, key = { it.id }) { task ->
                        TaskRow(
                            task = task,
                            onChangeState = { newState ->
                                viewModel.changeTaskState(task.id, newState.name)
                            },
                            onChangePriority = { newPriority ->
                                viewModel.changeTaskPriority(task.id, newPriority.name)
                            },
                            onEdit = { onEditTask(task, project.id) },
                            onDelete = { deleteConfirm = task.id to task.title },
                            onMove = { moveDialogTarget = task.id },
                        )
                    }

                    if (sortedChildren.isEmpty() && allChildren.isNotEmpty()) {
                        item(key = "empty-filtered") {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "No ${stateFilter.lowercase()} tasks",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Move dialog
    moveDialogTarget?.let { taskId ->
        MoveTaskDialog(
            projects = uiState.allProjects,
            currentParentId = uiState.project?.id ?: "",
            onDismiss = { moveDialogTarget = null },
            onConfirm = { targetProjectId ->
                viewModel.moveTask(taskId, targetProjectId)
                moveDialogTarget = null
            },
        )
    }

    // Delete confirmation
    deleteConfirm?.let { (taskId, title) ->
        AlertDialog(
            onDismissRequest = { deleteConfirm = null },
            title = { Text("Delete task?") },
            text = { Text("\"$title\" will be permanently deleted.") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteTask(taskId)
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

@Composable
private fun ProjectStateChanger(
    state: TaskState,
    enabled: Boolean,
    onChange: (TaskState) -> Unit,
) {
    var showMenu by remember { mutableStateOf(false) }
    Box {
        Surface(
            onClick = { if (enabled) showMenu = true },
            shape = RoundedCornerShape(20.dp),
            color = Color.Transparent,
            enabled = enabled,
        ) {
            Box(modifier = Modifier.padding(horizontal = 2.dp, vertical = 4.dp)) {
                StateBadge(state)
            }
        }
        DropdownMenu(
            expanded = showMenu,
            onDismissRequest = { showMenu = false },
        ) {
            TaskState.validTransitions(state).forEach { next ->
                DropdownMenuItem(
                    text = { StateBadge(next) },
                    onClick = {
                        showMenu = false
                        onChange(next)
                    },
                )
            }
        }
    }
}

@Composable
private fun ProjectPriorityChanger(
    priority: Priority,
    enabled: Boolean,
    onChange: (Priority) -> Unit,
) {
    var showMenu by remember { mutableStateOf(false) }
    Box {
        Surface(
            onClick = { if (enabled) showMenu = true },
            shape = RoundedCornerShape(12.dp),
            color = Color.Transparent,
            enabled = enabled,
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                PriorityDot(priority, size = PriorityDotSize.Medium)
                Spacer(Modifier.width(6.dp))
                Text(priority.label, style = MaterialTheme.typography.labelSmall)
            }
        }
        DropdownMenu(
            expanded = showMenu,
            onDismissRequest = { showMenu = false },
        ) {
            Priority.entries.forEach { p ->
                DropdownMenuItem(
                    text = { PriorityDot(p, showLabel = true) },
                    onClick = {
                        showMenu = false
                        onChange(p)
                    },
                )
            }
        }
    }
}
