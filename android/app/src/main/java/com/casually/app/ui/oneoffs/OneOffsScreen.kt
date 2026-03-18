package com.casually.app.ui.oneoffs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.casually.app.domain.model.ShortRunningTask
import com.casually.app.ui.components.*
import com.casually.app.ui.theme.CasuallyPurple

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OneOffsScreen(
    onCreateTask: (parentId: String) -> Unit,
    onEditTask: (ShortRunningTask, String) -> Unit,
    refreshTrigger: Int = 0,
    viewModel: OneOffsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(refreshTrigger) {
        if (refreshTrigger > 0) viewModel.refresh()
    }

    var moveDialogTarget by remember { mutableStateOf<String?>(null) }
    var deleteConfirm by remember { mutableStateOf<Pair<String, String>?>(null) }

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
                // Filter chips
                item(key = "filters") {
                    FilterChipRow(
                        label = "Tasks:",
                        selectedValue = uiState.stateFilter,
                        options = DEFAULT_FILTER_OPTIONS,
                        onSelect = { viewModel.setFilter(it) },
                    )
                    Spacer(Modifier.height(8.dp))
                }

                val filtered = if (uiState.stateFilter == "ALL") uiState.tasks
                    else uiState.tasks.filter { it.id in uiState.recentlyChangedIds || it.state.name == uiState.stateFilter }

                if (filtered.isEmpty()) {
                    item(key = "empty") {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                if (uiState.stateFilter == "ALL") "No one-off tasks yet"
                                else "No ${uiState.stateFilter.lowercase()} tasks",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }

                items(filtered, key = { it.id }) { task ->
                    val parentId = uiState.projectId ?: task.parentId
                    TaskRow(
                        task = task,
                        modifier = Modifier.animateItem(),
                        onChangeState = { newState -> viewModel.changeTaskState(task.id, newState.name) },
                        onChangePriority = { newPriority -> viewModel.changeTaskPriority(task.id, newPriority.name) },
                        onEdit = { onEditTask(task, parentId) },
                        onDelete = { deleteConfirm = Pair(task.id, task.title) },
                        onMove = { moveDialogTarget = task.id },
                    )
                }
            }

            // FAB - Add Task
            val parentId = uiState.projectId
            if (parentId != null) {
                FloatingActionButton(
                    onClick = { onCreateTask(parentId) },
                    containerColor = CasuallyPurple,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(16.dp),
                ) {
                    Icon(Icons.Default.Add, "Add task")
                }
            }
            }
        }
    }

    // Move dialog
    moveDialogTarget?.let { taskId ->
        MoveTaskDialog(
            projects = uiState.allProjects,
            currentParentId = uiState.projectId ?: "",
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
