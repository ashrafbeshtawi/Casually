package com.casually.app.ui.challenges

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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.casually.app.domain.model.Challenge
import com.casually.app.ui.components.ErrorScreen
import com.casually.app.ui.components.LoadingScreen
import com.casually.app.ui.theme.CasuallyPurple
import kotlinx.coroutines.delay
import java.time.Instant
import java.time.Duration

private data class League(val name: String, val emoji: String, val minDays: Long)

private val LEAGUES = listOf(
    League("Seedling", "\uD83C\uDF31", 0),
    League("Bronze", "\uD83E\uDD49", 3),
    League("Silver", "\uD83E\uDD48", 7),
    League("Gold", "\uD83E\uDD47", 14),
    League("Platinum", "\uD83D\uDC8E", 30),
    League("Diamond", "\uD83D\uDC51", 60),
    League("Master", "\uD83C\uDFC6", 120),
    League("Legend", "\u2B50", 365),
)

private fun getLeague(startedAt: String): League {
    val days = try {
        Duration.between(Instant.parse(startedAt), Instant.now()).toDays()
    } catch (_: Exception) { 0L }
    var league = LEAGUES[0]
    for (l in LEAGUES) {
        if (days >= l.minDays) league = l
    }
    return league
}

private fun formatDuration(startedAt: String): String {
    val seconds = try {
        Duration.between(Instant.parse(startedAt), Instant.now()).seconds
    } catch (_: Exception) { 0L }
    val days = seconds / 86400
    val hours = (seconds % 86400) / 3600
    val minutes = (seconds % 3600) / 60
    val secs = seconds % 60
    return when {
        days > 0 -> "${days}d ${hours}h ${minutes}m"
        hours > 0 -> "${hours}h ${minutes}m ${secs}s"
        else -> "${minutes}m ${secs}s"
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChallengesScreen(
    viewModel: ChallengesViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var showCreateDialog by remember { mutableStateOf(false) }

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
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (uiState.challenges.isEmpty()) {
                        item(key = "empty") {
                            Column(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Icon(
                                    Icons.Default.LocalFireDepartment,
                                    contentDescription = null,
                                    modifier = Modifier.size(48.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    "No challenges yet",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    "Create one to start tracking!",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }

                    items(uiState.challenges, key = { it.id }) { challenge ->
                        ChallengeCard(
                            challenge = challenge,
                            onRelapse = { viewModel.relapse(it) },
                            onDelete = { viewModel.delete(it) },
                        )
                    }

                    // League reference
                    if (uiState.challenges.isNotEmpty()) {
                        item(key = "leagues") {
                            Card(
                                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                                ),
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(
                                        "Leagues",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        LEAGUES.joinToString("  ") { "${it.emoji} ${it.name} (${it.minDays}d+)" },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }

                // FAB for creating challenges
                FloatingActionButton(
                    onClick = { showCreateDialog = true },
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(16.dp),
                    containerColor = CasuallyPurple,
                ) {
                    Icon(Icons.Default.Add, "Create challenge", tint = MaterialTheme.colorScheme.onPrimary)
                }
            }
        }
    }

    // Create challenge dialog
    if (showCreateDialog) {
        CreateChallengeDialog(
            onDismiss = { showCreateDialog = false },
            onCreate = { title, emoji ->
                viewModel.createChallenge(title, emoji)
                showCreateDialog = false
            },
        )
    }
}

@Composable
private fun ChallengeCard(
    challenge: Challenge,
    onRelapse: (String) -> Unit,
    onDelete: (String) -> Unit,
) {
    val league = getLeague(challenge.startedAt)
    var duration by remember { mutableStateOf(formatDuration(challenge.startedAt)) }
    var showRelapseDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }

    LaunchedEffect(challenge.startedAt) {
        while (true) {
            delay(1000)
            duration = formatDuration(challenge.startedAt)
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    challenge.emoji ?: league.emoji,
                    fontSize = 28.sp,
                )
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        challenge.title,
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Text(
                        "${league.emoji} ${league.name}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = { showRelapseDialog = true }, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Default.Refresh, "Relapse", Modifier.size(18.dp))
                }
                IconButton(onClick = { showDeleteDialog = true }, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Default.Delete, "Delete", Modifier.size(18.dp), tint = MaterialTheme.colorScheme.error)
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(
                duration,
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = FontFamily.Monospace,
                ),
            )
        }
    }

    if (showRelapseDialog) {
        AlertDialog(
            onDismissRequest = { showRelapseDialog = false },
            title = { Text("Reset challenge?") },
            text = { Text("This will reset your timer for \"${challenge.title}\" back to zero.") },
            confirmButton = {
                TextButton(onClick = {
                    onRelapse(challenge.id)
                    showRelapseDialog = false
                }) { Text("Reset") }
            },
            dismissButton = {
                TextButton(onClick = { showRelapseDialog = false }) { Text("Cancel") }
            },
        )
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete challenge?") },
            text = { Text("\"${challenge.title}\" will be permanently deleted.") },
            confirmButton = {
                TextButton(onClick = {
                    onDelete(challenge.id)
                    showDeleteDialog = false
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") }
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateChallengeDialog(
    onDismiss: () -> Unit,
    onCreate: (title: String, emoji: String?) -> Unit,
) {
    var title by remember { mutableStateOf("") }
    var emoji by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create Challenge") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Title") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                )
                OutlinedTextField(
                    value = emoji,
                    onValueChange = { emoji = it },
                    label = { Text("Emoji (optional)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onCreate(title.trim(), emoji.trim().ifEmpty { null }) },
                enabled = title.isNotBlank(),
            ) { Text("Create") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
    )
}
