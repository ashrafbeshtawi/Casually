package com.casually.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.TaskState

@Composable
fun StateChangeDialog(
    currentState: TaskState,
    isProject: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (TaskState) -> Unit,
) {
    val validStates = TaskState.validTransitions(currentState)
    var selected by remember { mutableStateOf(validStates.firstOrNull()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Change State") },
        text = {
            Column {
                if (isProject) {
                    Text(
                        "This will change all child tasks to the same state.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error,
                    )
                    Spacer(Modifier.height(12.dp))
                }
                validStates.forEach { state ->
                    Row(modifier = Modifier.fillMaxWidth()) {
                        RadioButton(
                            selected = state == selected,
                            onClick = { selected = state },
                        )
                        Spacer(Modifier.width(8.dp))
                        TextButton(onClick = { selected = state }) {
                            Text(state.label)
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { selected?.let { onConfirm(it) } },
                enabled = selected != null,
            ) { Text("Confirm") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
    )
}
