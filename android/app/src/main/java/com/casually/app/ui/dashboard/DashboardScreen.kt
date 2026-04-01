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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.casually.app.ui.components.*
import com.casually.app.ui.theme.CasuallyPurple

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onProjectClick: (String) -> Unit,
    onCreateProject: () -> Unit,
    onEditProject: (com.casually.app.domain.model.LongRunningTask) -> Unit = {},
    refreshTrigger: Int = 0,
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    // Re-fetch when external actions (create/edit) bump the trigger
    LaunchedEffect(refreshTrigger) {
        if (refreshTrigger > 0) viewModel.refresh()
    }

    var deleteConfirm by remember { mutableStateOf<Pair<String, String>?>(null) }

    val filtered = if (uiState.projectStateFilter == "ALL") {
        uiState.projects
    } else {
        uiState.projects.filter { it.id in uiState.recentlyChangedProjectIds || it.state.name == uiState.projectStateFilter }
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
                    // Filter row
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

                    items(filtered, key = { it.id }) { project ->
                        ProjectCard(
                            task = project,
                            onClick = { onProjectClick(project.id) },
                            onEdit = { onEditProject(project) },
                            modifier = Modifier.padding(vertical = 4.dp),
                        )
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

    // Delete confirmation
    deleteConfirm?.let { (id, title) ->
        AlertDialog(
            onDismissRequest = { deleteConfirm = null },
            title = { Text("Delete project?") },
            text = { Text("\"$title\" will be permanently deleted.") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteProject(id)
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
