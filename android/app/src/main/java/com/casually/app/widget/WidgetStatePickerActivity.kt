package com.casually.app.widget

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.sp
import com.casually.app.domain.model.TaskState
import androidx.glance.appwidget.updateAll
import androidx.lifecycle.lifecycleScope
import androidx.work.*
import kotlinx.coroutines.launch

class WidgetStatePickerActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val itemId = intent.getStringExtra("item_id") ?: run { finish(); return }
        val itemType = intent.getStringExtra("item_type") ?: run { finish(); return }
        val currentStateStr = intent.getStringExtra("current_state") ?: run { finish(); return }
        val itemName = intent.getStringExtra("item_name")

        val currentState = try {
            TaskState.valueOf(currentStateStr)
        } catch (_: Exception) {
            TaskState.ACTIVE
        }

        val transitions = TaskState.validTransitions(currentState)

        setContent {
            StatePickerDialog(
                itemName = itemName,
                currentState = currentState,
                transitions = transitions,
                onPick = { picked ->
                    lifecycleScope.launch {
                        performStateChange(itemId, itemType, picked.name)
                        finish()
                    }
                },
                onDismiss = { finish() },
            )
        }
    }

    private suspend fun performStateChange(id: String, type: String, newState: String) {
        val provider = WidgetDataProvider(applicationContext)

        // Optimistic: mutate cache immediately and update widget
        val cached = provider.loadFromCache()
        if (cached != null) {
            val optimistic = if (type == "long") {
                if (newState != "ACTIVE") {
                    cached.copy(projects = cached.projects.filter { it.id != id })
                } else {
                    cached.copy(projects = cached.projects.map {
                        if (it.id == id) it.copy(state = newState) else it
                    })
                }
            } else {
                if (newState != "ACTIVE") {
                    cached.copy(tasksByProject = cached.tasksByProject.mapValues { (_, tasks) ->
                        tasks.filter { it.id != id }
                    })
                } else {
                    cached.copy(tasksByProject = cached.tasksByProject.mapValues { (_, tasks) ->
                        tasks.map { if (it.id == id) it.copy(state = newState) else it }
                    })
                }
            }
            provider.saveToCache(optimistic)
            CasuallyWidget().updateAll(applicationContext)
        }

        // Fire background work that survives Activity destruction
        val workData = workDataOf(
            "action" to "state_change",
            "item_id" to id,
            "item_type" to type,
            "new_state" to newState,
        )
        val request = OneTimeWorkRequestBuilder<WidgetActionWorker>()
            .setInputData(workData)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(applicationContext).enqueue(request)
    }
}

private fun stateEmoji(state: TaskState): String = when (state) {
    TaskState.ACTIVE -> "\u26A1"
    TaskState.WAITING -> "\u23F3"
    TaskState.BLOCKED -> "\uD83D\uDEAB"
    TaskState.DONE -> "\u2705"
}

private fun stateDescription(state: TaskState): String = when (state) {
    TaskState.ACTIVE -> "Actively being worked on"
    TaskState.WAITING -> "Waiting for something"
    TaskState.BLOCKED -> "Cannot proceed right now"
    TaskState.DONE -> "Completed"
}

@Composable
private fun StatePickerDialog(
    itemName: String?,
    currentState: TaskState,
    transitions: List<TaskState>,
    onPick: (TaskState) -> Unit,
    onDismiss: () -> Unit,
) {
    // Full-screen scrim
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.4f))
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
            ) { onDismiss() },
        contentAlignment = Alignment.BottomCenter,
    ) {
        // Bottom-sheet style card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .clickable(
                    indication = null,
                    interactionSource = remember { MutableInteractionSource() },
                ) { /* consume click */ },
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface,
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
            ) {
                // Current state header
                Row(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        stateEmoji(currentState),
                        fontSize = 20.sp,
                    )
                    Spacer(Modifier.width(8.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        if (!itemName.isNullOrBlank()) {
                            Text(
                                itemName,
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                ),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                        Text(
                            "Currently: ${currentState.label}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                // State options
                transitions.forEach { state ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onPick(state) }
                            .padding(vertical = 14.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            stateEmoji(state),
                            fontSize = 24.sp,
                        )
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(
                                state.label,
                                style = MaterialTheme.typography.bodyLarge.copy(
                                    fontWeight = FontWeight.Medium,
                                ),
                            )
                            Text(
                                stateDescription(state),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Cancel button
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                ) {
                    Text("Cancel")
                }
            }
        }
    }
}
