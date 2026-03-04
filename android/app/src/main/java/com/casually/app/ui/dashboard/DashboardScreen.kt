package com.casually.app.ui.dashboard

import androidx.compose.animation.*
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DriveFileMove
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.Priority
import com.casually.app.domain.model.ShortRunningTask
import com.casually.app.domain.model.TaskState
import com.casually.app.ui.components.*
import com.casually.app.ui.theme.CasuallyPurple

private val FILTER_OPTIONS = listOf(
    "ALL" to "All",
    "ACTIVE" to "Active",
    "WAITING" to "Waiting",
    "BLOCKED" to "Blocked",
    "DONE" to "Done",
)

private val PROTECTED_TITLES = listOf("One-Off Tasks", "Routines")

@Composable
private fun FilterChipRow(
    label: String,
    selectedValue: String,
    onSelect: (String) -> Unit,
) {
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        FILTER_OPTIONS.forEach { (value, chipLabel) ->
            val isSelected = selectedValue == value
            Surface(
                onClick = { onSelect(value) },
                shape = RoundedCornerShape(20.dp),
                color = if (isSelected) CasuallyPurple else MaterialTheme.colorScheme.surfaceContainer,
                contentColor = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface,
            ) {
                Text(
                    chipLabel,
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onCreateProject: () -> Unit,
    onCreateTask: (parentId: String) -> Unit,
    onEditProject: (LongRunningTask) -> Unit,
    onEditTask: (ShortRunningTask, String) -> Unit,
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()

    // Dialogs
    var stateDialogTarget by remember { mutableStateOf<Pair<String, TaskState>?>(null) }
    var priorityDialogTarget by remember { mutableStateOf<Pair<String, Priority>?>(null) }
    var moveDialogTarget by remember { mutableStateOf<Pair<String, String>?>(null) }
    var deleteConfirm by remember { mutableStateOf<Triple<String, String, Boolean>?>(null) }
    var dialogIsProject by remember { mutableStateOf(false) }
    var dialogProjectId by remember { mutableStateOf("") }

    val filtered = if (uiState.projectStateFilter == "ALL") {
        uiState.projects
    } else {
        uiState.projects.filter { it.state.name == uiState.projectStateFilter }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dashboard") },
                scrollBehavior = scrollBehavior,
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onCreateProject,
                containerColor = CasuallyPurple,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp),
            ) {
                Icon(Icons.Default.Add, "Create project")
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
            else -> PullToRefreshBox(
                isRefreshing = false,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.padding(padding),
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
                                onSelect = { viewModel.setProjectFilter(it) },
                            )
                            FilterChipRow(
                                label = "Tasks:",
                                selectedValue = uiState.taskStateFilter,
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
                        val doneCount = allChildren.count { it.state == TaskState.DONE }

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
                                doneCount = if (isExpanded) doneCount else 0,
                                isProtected = isProtected,
                                onToggle = { viewModel.toggleProject(project.id) },
                                onAddTask = { onCreateTask(project.id) },
                                onChangeState = {
                                    dialogIsProject = true
                                    dialogProjectId = project.id
                                    stateDialogTarget = Pair(project.id, project.state)
                                },
                                onChangePriority = {
                                    dialogIsProject = true
                                    dialogProjectId = project.id
                                    priorityDialogTarget = Pair(project.id, project.priority)
                                },
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
                                        onChangeState = {
                                            dialogIsProject = false
                                            dialogProjectId = project.id
                                            stateDialogTarget = Pair(task.id, task.state)
                                        },
                                        onChangePriority = {
                                            dialogIsProject = false
                                            dialogProjectId = project.id
                                            priorityDialogTarget = Pair(task.id, task.priority)
                                        },
                                        onEdit = { onEditTask(task, project.id) },
                                        onDelete = { deleteConfirm = Triple(task.id, task.title, false) },
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
    }

    // State change dialog
    stateDialogTarget?.let { (id, currentState) ->
        StateChangeDialog(
            currentState = currentState,
            isProject = dialogIsProject,
            onDismiss = { stateDialogTarget = null },
            onConfirm = { newState ->
                if (dialogIsProject) {
                    viewModel.changeProjectState(id, newState.name)
                } else {
                    viewModel.changeTaskState(id, dialogProjectId, newState.name)
                }
                stateDialogTarget = null
            },
        )
    }

    // Priority change dialog
    priorityDialogTarget?.let { (id, currentPriority) ->
        PriorityChangeDialog(
            currentPriority = currentPriority,
            onDismiss = { priorityDialogTarget = null },
            onConfirm = { newPriority ->
                if (dialogIsProject) {
                    viewModel.changeProjectPriority(id, newPriority.name)
                } else {
                    viewModel.changeTaskPriority(id, dialogProjectId, newPriority.name)
                }
                priorityDialogTarget = null
            },
        )
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
                    else viewModel.deleteTask(id, dialogProjectId)
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
private fun ProjectHeader(
    project: LongRunningTask,
    isExpanded: Boolean,
    childCount: Int,
    doneCount: Int,
    isProtected: Boolean,
    onToggle: () -> Unit,
    onAddTask: () -> Unit,
    onChangeState: () -> Unit,
    onChangePriority: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    val borderColor = project.priority.color
    val chevronRotation by animateFloatAsState(
        targetValue = if (isExpanded) 90f else 0f,
        animationSpec = tween(200),
        label = "chevron",
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .drawBehind {
                drawLine(
                    color = borderColor,
                    start = Offset(0f, 0f),
                    end = Offset(0f, size.height),
                    strokeWidth = 8.dp.toPx(),
                )
            },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column {
            // Title row — tappable to expand/collapse
            Row(
                modifier = Modifier
                    .clickable { onToggle() }
                    .padding(start = 12.dp, end = 8.dp, top = 10.dp, bottom = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = if (isExpanded) "Collapse" else "Expand",
                    modifier = Modifier
                        .size(20.dp)
                        .rotate(chevronRotation),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.width(4.dp))
                if (project.emoji != null) {
                    Text(project.emoji, style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.width(6.dp))
                }
                Text(
                    project.title,
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.weight(1f),
                )
                // Tappable state badge
                Surface(
                    onClick = onChangeState,
                    shape = RoundedCornerShape(20.dp),
                    color = Color.Transparent,
                ) {
                    StateBadge(project.state)
                }
                Spacer(Modifier.width(4.dp))
                // Tappable priority dot
                Surface(
                    onClick = onChangePriority,
                    shape = RoundedCornerShape(12.dp),
                    color = Color.Transparent,
                ) {
                    Box(
                        modifier = Modifier.size(28.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        PriorityDot(project.priority, size = PriorityDotSize.Medium)
                    }
                }
            }

            // Progress bar when has children
            if (childCount > 0) {
                TaskProgressBar(
                    done = if (isExpanded) doneCount else 0,
                    total = childCount,
                    priority = project.priority,
                    modifier = Modifier.padding(start = 40.dp, end = 12.dp, bottom = 4.dp),
                )
            }

            // Action row — only when expanded
            AnimatedVisibility(
                visible = isExpanded,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically(),
            ) {
                Row(
                    modifier = Modifier
                        .padding(start = 40.dp, end = 8.dp, bottom = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    // Add task button — always shown
                    Surface(
                        onClick = onAddTask,
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.surfaceContainer,
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Icon(Icons.Default.Add, "Add", Modifier.size(18.dp))
                            Text("Add", style = MaterialTheme.typography.labelMedium)
                        }
                    }

                    if (!isProtected) {
                        // Edit button
                        Surface(
                            onClick = onEdit,
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.surfaceContainer,
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Icon(Icons.Default.Edit, "Edit", Modifier.size(18.dp))
                                Text("Edit", style = MaterialTheme.typography.labelMedium)
                            }
                        }

                        // Delete button
                        Surface(
                            onClick = onDelete,
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f),
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Icon(
                                    Icons.Default.Delete, "Delete",
                                    Modifier.size(18.dp),
                                    tint = MaterialTheme.colorScheme.error,
                                )
                                Text(
                                    "Delete",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.error,
                                )
                            }
                        }
                    }

                    Spacer(Modifier.weight(1f))
                }
            }

            // Description (shown when expanded)
            AnimatedVisibility(
                visible = isExpanded && !isProtected && project.description != null,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically(),
            ) {
                project.description?.let {
                    Text(
                        it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(start = 40.dp, end = 12.dp, bottom = 8.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun TaskRow(
    task: ShortRunningTask,
    modifier: Modifier = Modifier,
    onChangeState: () -> Unit,
    onChangePriority: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onMove: () -> Unit,
) {
    val borderColor = task.priority.color
    var showMenu by remember { mutableStateOf(false) }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = 24.dp, end = 0.dp, top = 2.dp, bottom = 2.dp)
            .drawBehind {
                drawLine(
                    color = borderColor,
                    start = Offset(0f, size.height * 0.2f),
                    end = Offset(0f, size.height * 0.8f),
                    strokeWidth = 4.dp.toPx(),
                )
            },
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            modifier = Modifier.padding(start = 10.dp, end = 4.dp, top = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (task.emoji != null) {
                Text(task.emoji, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.width(6.dp))
            }
            Text(
                task.title,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f),
            )

            // Tappable priority dot
            Surface(
                onClick = onChangePriority,
                shape = RoundedCornerShape(12.dp),
                color = Color.Transparent,
            ) {
                Box(
                    modifier = Modifier.size(32.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    PriorityDot(task.priority, size = PriorityDotSize.Medium)
                }
            }

            // Tappable state badge
            Surface(
                onClick = onChangeState,
                shape = RoundedCornerShape(20.dp),
                color = Color.Transparent,
            ) {
                Box(modifier = Modifier.padding(horizontal = 2.dp, vertical = 4.dp)) {
                    StateBadge(task.state)
                }
            }

            // Overflow menu
            Box {
                IconButton(onClick = { showMenu = true }, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Default.MoreVert, "More options", Modifier.size(20.dp))
                }
                DropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false },
                ) {
                    DropdownMenuItem(
                        text = { Text("Edit") },
                        onClick = { showMenu = false; onEdit() },
                        leadingIcon = { Icon(Icons.Default.Edit, null, Modifier.size(18.dp)) },
                    )
                    DropdownMenuItem(
                        text = { Text("Move to\u2026") },
                        onClick = { showMenu = false; onMove() },
                        leadingIcon = { Icon(Icons.AutoMirrored.Filled.DriveFileMove, null, Modifier.size(18.dp)) },
                    )
                    DropdownMenuItem(
                        text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                        onClick = { showMenu = false; onDelete() },
                        leadingIcon = {
                            Icon(
                                Icons.Default.Delete, null,
                                Modifier.size(18.dp),
                                tint = MaterialTheme.colorScheme.error,
                            )
                        },
                    )
                }
            }
        }
    }
}
