package com.casually.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.Priority
import com.casually.app.domain.model.TaskState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskFormSheet(
    title: String,
    initialTitle: String = "",
    initialDescription: String = "",
    initialEmoji: String = "",
    initialPriority: Priority = Priority.MEDIUM,
    initialState: TaskState? = null,
    showStateField: Boolean = false,
    onDismiss: () -> Unit,
    onSubmit: (title: String, description: String?, emoji: String?, priority: String, state: String?) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var taskTitle by remember { mutableStateOf(initialTitle) }
    var taskDescription by remember { mutableStateOf(initialDescription) }
    var taskEmoji by remember { mutableStateOf(initialEmoji) }
    var selectedPriority by remember { mutableStateOf(initialPriority) }
    var selectedState by remember { mutableStateOf(initialState ?: TaskState.WAITING) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(title, style = MaterialTheme.typography.headlineSmall)

            OutlinedTextField(
                value = taskTitle,
                onValueChange = { taskTitle = it },
                label = { Text("Title") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            OutlinedTextField(
                value = taskDescription,
                onValueChange = { taskDescription = it },
                label = { Text("Description (optional)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
            )

            OutlinedTextField(
                value = taskEmoji,
                onValueChange = { taskEmoji = it },
                label = { Text("Emoji (optional)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            // Priority selector
            Text("Priority", style = MaterialTheme.typography.labelLarge)
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                Priority.entries.forEachIndexed { index, priority ->
                    SegmentedButton(
                        shape = SegmentedButtonDefaults.itemShape(index, Priority.entries.size),
                        onClick = { selectedPriority = priority },
                        selected = selectedPriority == priority,
                    ) { Text(priority.label, style = MaterialTheme.typography.labelSmall) }
                }
            }

            // State selector (for projects only)
            if (showStateField) {
                Text("State", style = MaterialTheme.typography.labelLarge)
                SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                    TaskState.entries.forEachIndexed { index, state ->
                        SegmentedButton(
                            shape = SegmentedButtonDefaults.itemShape(index, TaskState.entries.size),
                            onClick = { selectedState = state },
                            selected = selectedState == state,
                        ) { Text(state.label, style = MaterialTheme.typography.labelSmall) }
                    }
                }
            }

            Spacer(Modifier.height(8.dp))
            Button(
                onClick = {
                    onSubmit(
                        taskTitle.trim(),
                        taskDescription.trim().ifEmpty { null },
                        taskEmoji.trim().ifEmpty { null },
                        selectedPriority.name,
                        if (showStateField) selectedState.name else null,
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = taskTitle.isNotBlank(),
            ) { Text("Save") }

            Spacer(Modifier.height(24.dp))
        }
    }
}
