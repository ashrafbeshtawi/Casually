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
import androidx.compose.ui.unit.sp
import com.casually.app.BuildConfig
import com.casually.app.data.SessionManager
import com.casually.app.domain.model.TaskState
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class WidgetStatePickerActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val itemId = intent.getStringExtra("item_id") ?: run { finish(); return }
        val itemType = intent.getStringExtra("item_type") ?: run { finish(); return }
        val currentStateStr = intent.getStringExtra("current_state") ?: run { finish(); return }

        val currentState = try {
            TaskState.valueOf(currentStateStr)
        } catch (_: Exception) {
            TaskState.ACTIVE
        }

        val transitions = TaskState.validTransitions(currentState)

        setContent {
            StatePickerDialog(
                currentState = currentState,
                transitions = transitions,
                onPick = { picked ->
                    performStateChange(itemId, itemType, picked.name)
                    finish()
                },
                onDismiss = { finish() },
            )
        }
    }

    private fun performStateChange(id: String, type: String, newState: String) {
        val sessionManager = SessionManager(applicationContext)
        val token = sessionManager.sessionToken ?: return
        val provider = WidgetDataProvider(applicationContext)

        // Optimistic: mutate cache immediately and update widget
        val cached = provider.loadFromCache()
        if (cached != null) {
            val optimistic = if (type == "long") {
                cached.copy(projects = cached.projects.map {
                    if (it.id == id) it.copy(state = newState) else it
                })
            } else {
                cached.copy(tasksByProject = cached.tasksByProject.mapValues { (_, tasks) ->
                    tasks.map { if (it.id == id) it.copy(state = newState) else it }
                })
            }
            provider.saveToCache(optimistic)
            CoroutineScope(Dispatchers.Main).launch {
                CasuallyWidget().updateAll(applicationContext)
            }
        }

        // Fire API in background, then re-fetch and sync
        CoroutineScope(Dispatchers.IO).launch {
            val data = provider.changeState(BuildConfig.API_BASE_URL, token, id, type, newState)
            if (data != null) {
                provider.saveToCache(data)
            }
            launch(Dispatchers.Main) {
                CasuallyWidget().updateAll(applicationContext)
            }
        }
    }
}

private val StateActiveColor = Color(0xFF22C55E)
private val StateWaitingColor = Color(0xFFEAB308)
private val StateBlockedColor = Color(0xFFEF4444)
private val StateDoneColor = Color(0xFF6B7280)

private fun stateDisplayColor(state: TaskState): Color = when (state) {
    TaskState.ACTIVE -> StateActiveColor
    TaskState.WAITING -> StateWaitingColor
    TaskState.BLOCKED -> StateBlockedColor
    TaskState.DONE -> StateDoneColor
}

@Composable
private fun StatePickerDialog(
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
        contentAlignment = Alignment.Center,
    ) {
        // Dialog card — stop clicks from passing through to scrim
        Card(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .clickable(
                    indication = null,
                    interactionSource = remember { MutableInteractionSource() },
                ) { /* consume click */ },
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface,
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    "Change State",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                    ),
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    "Currently: ${currentState.label}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                Spacer(modifier = Modifier.height(16.dp))

                // State pill buttons
                transitions.forEach { state ->
                    val bgColor = stateDisplayColor(state)
                    Button(
                        onClick = { onPick(state) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = bgColor,
                            contentColor = Color.White,
                        ),
                    ) {
                        Text(
                            state.label,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                TextButton(onClick = onDismiss) {
                    Text("Cancel")
                }
            }
        }
    }
}
