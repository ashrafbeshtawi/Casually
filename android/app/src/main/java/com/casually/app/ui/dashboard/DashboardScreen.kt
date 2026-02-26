package com.casually.app.ui.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.casually.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onProjectClick: (String) -> Unit,
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            TopAppBar(
                title = { Text("Dashboard") },
                scrollBehavior = scrollBehavior,
            )
        }
    ) { padding ->
        when {
            uiState.error != null -> ErrorScreen(
                message = uiState.error!!,
                onRetry = { viewModel.refresh() },
                modifier = Modifier.padding(padding),
            )
            uiState.isLoading -> LoadingScreen(modifier = Modifier.padding(padding))
            uiState.groups.isEmpty() -> Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                Text("No active tasks", style = MaterialTheme.typography.bodyLarge)
            }
            else -> PullToRefreshBox(
                isRefreshing = uiState.isLoading,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.padding(padding),
            ) {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    uiState.groups.forEach { group ->
                        item(key = "header-${group.project.id}") {
                            Row(
                                modifier = Modifier.padding(vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                if (group.project.emoji != null) {
                                    Text(group.project.emoji, style = MaterialTheme.typography.titleMedium)
                                    Spacer(Modifier.width(8.dp))
                                }
                                Text(group.project.title, style = MaterialTheme.typography.titleMedium)
                            }
                        }
                        items(group.tasks, key = { it.id }) { task ->
                            TaskCard(
                                task = task,
                                onClick = { onProjectClick(group.project.id) },
                            )
                        }
                    }
                }
            }
        }
    }
}
