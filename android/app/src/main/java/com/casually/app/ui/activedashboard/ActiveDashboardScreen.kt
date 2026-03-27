package com.casually.app.ui.activedashboard

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.casually.app.domain.model.ShortRunningTask
import com.casually.app.ui.components.*
import com.casually.app.ui.theme.CasuallyPurple

private val PROTECTED_TITLES = listOf("One-Off Tasks", "Routines")

private enum class DashboardTab(val label: String) {
    ONE_OFFS("One-Offs"),
    PROJECTS("Projects"),
    ROUTINES("Routines"),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveDashboardScreen(
    onCreateTask: (parentId: String) -> Unit,
    onCreateTaskWithPicker: () -> Unit = {},
    onEditTask: (ShortRunningTask, String) -> Unit,
    refreshTrigger: Int = 0,
    viewModel: ActiveDashboardViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var activeTab by remember { mutableStateOf(DashboardTab.ONE_OFFS) }

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
    var deleteConfirm by remember { mutableStateOf<Triple<String, String, String>?>(null) }

    val filteredProjects = uiState.activeProjects.filter { project ->
        when (activeTab) {
            DashboardTab.ONE_OFFS -> project.title == "One-Off Tasks"
            DashboardTab.ROUTINES -> project.title == "Routines"
            DashboardTab.PROJECTS -> project.title !in PROTECTED_TITLES
        }
    }

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
            Box(modifier = Modifier.fillMaxSize()) {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(0.dp),
            ) {
                // Tabs
                item(key = "tabs") {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        DashboardTab.entries.forEach { tab ->
                            val isSelected = tab == activeTab
                            Surface(
                                onClick = { activeTab = tab },
                                shape = RoundedCornerShape(20.dp),
                                color = if (isSelected) CasuallyPurple else MaterialTheme.colorScheme.surfaceContainer,
                            ) {
                                Text(
                                    tab.label,
                                    style = MaterialTheme.typography.labelMedium,
                                    color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                )
                            }
                        }
                    }
                }

                if (filteredProjects.isEmpty()) {
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

                filteredProjects.forEach { project ->
                    val children = uiState.childrenByProject[project.id] ?: emptyList()
                    val isCollapsed = uiState.collapsedProjects.contains(project.id)

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
                            Column(modifier = Modifier.animateContentSize()) {
                                Row(
                                    modifier = Modifier
                                        .clickable { viewModel.toggleProjectCollapse(project.id) }
                                        .padding(start = 12.dp, end = 12.dp, top = 10.dp, bottom = if (!isCollapsed && children.isNotEmpty()) 4.dp else 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(
                                        if (isCollapsed) Icons.Default.KeyboardArrowRight else Icons.Default.KeyboardArrowDown,
                                        contentDescription = if (isCollapsed) "Expand" else "Collapse",
                                        modifier = Modifier.size(20.dp),
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

                    if (!isCollapsed) {
                        items(children, key = { it.id }) { task ->
                            TaskRow(
                                task = task,
                                showEdit = false,
                                onChangeState = { newState -> viewModel.changeTaskState(task.id, project.id, newState.name) },
                                onChangePriority = { newPriority -> viewModel.changeTaskPriority(task.id, project.id, newPriority.name) },
                                onDelete = { deleteConfirm = Triple(task.id, task.title, project.id) },
                                onMove = { moveDialogTarget = Pair(task.id, project.id) },
                            )
                        }
                    }
                }
            }

            FloatingActionButton(
                onClick = { onCreateTaskWithPicker() },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(16.dp),
                containerColor = CasuallyPurple,
            ) {
                Icon(Icons.Default.Add, "Add task", tint = MaterialTheme.colorScheme.onPrimary)
            }
            }
        }
    }

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
