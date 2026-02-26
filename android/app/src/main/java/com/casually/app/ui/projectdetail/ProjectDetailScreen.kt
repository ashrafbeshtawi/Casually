package com.casually.app.ui.projectdetail

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.casually.app.domain.model.TaskState
import com.casually.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectDetailScreen(
    onBack: () -> Unit,
    onAddTask: (String) -> Unit,
    viewModel: ProjectDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var showStateDialog by remember { mutableStateOf(false) }
    var taskStateDialogId by remember { mutableStateOf<Pair<String, TaskState>?>(null) }

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
            uiState.project != null -> {
                val project = uiState.project!!
                LazyColumn(
                    modifier = Modifier.padding(padding),
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
                                StateBadge(project.state)
                                Spacer(Modifier.width(8.dp))
                                PriorityDot(project.priority)
                                Spacer(Modifier.width(4.dp))
                                Text(project.priority.label, style = MaterialTheme.typography.labelSmall)
                                Spacer(Modifier.weight(1f))
                                OutlinedButton(onClick = { showStateDialog = true }) {
                                    Text("Change State")
                                }
                            }
                            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                            Text(
                                "${project.children?.size ?: 0} tasks",
                                style = MaterialTheme.typography.titleSmall,
                            )
                        }
                    }

                    // Child tasks
                    val children = project.children ?: emptyList()
                    items(children, key = { it.id }) { task ->
                        TaskCard(
                            task = task,
                            onClick = {
                                taskStateDialogId = Pair(task.id, task.state)
                            },
                        )
                    }
                }
            }
        }
    }

    // Project state change dialog
    if (showStateDialog && uiState.project != null) {
        StateChangeDialog(
            currentState = uiState.project!!.state,
            isProject = true,
            onDismiss = { showStateDialog = false },
            onConfirm = { newState ->
                viewModel.changeProjectState(newState.name)
                showStateDialog = false
            },
        )
    }

    // Task state change dialog
    taskStateDialogId?.let { (taskId, currentState) ->
        StateChangeDialog(
            currentState = currentState,
            isProject = false,
            onDismiss = { taskStateDialogId = null },
            onConfirm = { newState ->
                viewModel.changeTaskState(taskId, newState.name)
                taskStateDialogId = null
            },
        )
    }
}
