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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.casually.app.BuildConfig
import com.casually.app.data.SessionManager
import com.casually.app.domain.model.TaskState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope

/**
 * Transparent overlay that shows a bottom-sheet-style state picker when the
 * user taps a task in the widget.
 *
 * Flow:
 *   1. Show picker dialog
 *   2. On pick → optimistic update (mutate data in Glance state)
 *   3. PATCH server directly (not via WorkManager)
 *   4. Re-fetch server truth
 *   5. Always clear loading
 */
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

        setContent {
            StatePickerDialog(
                itemName = itemName,
                currentState = currentState,
                transitions = TaskState.validTransitions(currentState),
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
        val sessionManager = SessionManager(applicationContext)
        val token = sessionManager.sessionToken
        val baseUrl = BuildConfig.API_BASE_URL

        // 1. Show loading
        provider.setLoading(true)
        provider.refreshWidgets()

        // 2. Optimistic update — read current data from the first widget's
        //    Glance state, mutate, and push back to all widgets.
        val currentJson = getCurrentDataJson()
        val cached = currentJson?.let { WidgetDataProvider.deserialize(it) }
        if (cached != null) {
            val optimistic = applyOptimisticUpdate(cached, id, type, newState)
            provider.pushData(optimistic)
            provider.refreshWidgets()
        }

        // 3. Send PATCH directly (on IO thread)
        if (token != null) {
            val success = withContext(Dispatchers.IO) {
                provider.patchState(baseUrl, token, id, type, newState)
            }

            // 4. Fetch server truth
            withContext(Dispatchers.IO) {
                if (success) delay(1000) // let server settle
                val fresh = provider.fetchData(baseUrl, token)
                if (fresh != null) {
                    provider.pushData(fresh)
                }
            }
        }

        // 5. Always clear loading and re-render
        provider.clearLoading()
        provider.refreshWidgets()
    }

    /**
     * Read the serialised data JSON from the first widget instance's Glance
     * preferences. Returns null if no widget exists or no data is stored.
     */
    private suspend fun getCurrentDataJson(): String? {
        return try {
            val manager =
                androidx.glance.appwidget.GlanceAppWidgetManager(applicationContext)
            val ids = manager.getGlanceIds(CasuallyWidget::class.java)
            if (ids.isEmpty()) return null

            // Read via updateAppWidgetState and capture the value
            var json: String? = null
            androidx.glance.appwidget.state.updateAppWidgetState(
                applicationContext, ids.first()
            ) { prefs ->
                json = prefs[WidgetKeys.DataKey]
            }
            json
        } catch (_: Exception) {
            null
        }
    }

    private fun applyOptimisticUpdate(
        data: WidgetData,
        id: String,
        type: String,
        newState: String,
    ): WidgetData {
        return if (type == "long") {
            if (newState != "ACTIVE") {
                data.copy(projects = data.projects.filter { it.id != id })
            } else {
                data.copy(projects = data.projects.map {
                    if (it.id == id) it.copy(state = newState) else it
                })
            }
        } else {
            if (newState != "ACTIVE") {
                data.copy(tasksByProject = data.tasksByProject.mapValues { (_, tasks) ->
                    tasks.filter { it.id != id }
                })
            } else {
                data.copy(tasksByProject = data.tasksByProject.mapValues { (_, tasks) ->
                    tasks.map { if (it.id == id) it.copy(state = newState) else it }
                })
            }
        }
    }
}

// ── State Picker UI ──────────────────────────────────────────────────────────

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
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .clickable(
                    indication = null,
                    interactionSource = remember { MutableInteractionSource() },
                ) {},
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface,
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                // Current state header
                Row(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(stateEmoji(currentState), fontSize = 20.sp)
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

                transitions.forEach { state ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onPick(state) }
                            .padding(vertical = 14.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(stateEmoji(state), fontSize = 24.sp)
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
                    HorizontalDivider(
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                ) { Text("Cancel") }
            }
        }
    }
}
