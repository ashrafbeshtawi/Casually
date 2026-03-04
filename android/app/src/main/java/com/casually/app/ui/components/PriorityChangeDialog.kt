package com.casually.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.Priority

@Composable
fun PriorityChangeDialog(
    currentPriority: Priority,
    onDismiss: () -> Unit,
    onConfirm: (Priority) -> Unit,
) {
    var selected by remember { mutableStateOf(currentPriority) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Change Priority") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Priority.entries.forEach { priority ->
                    val isSelected = priority == selected
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selected = priority },
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(
                            width = if (isSelected) 2.dp else 1.dp,
                            color = if (isSelected) priority.color else MaterialTheme.colorScheme.outlineVariant,
                        ),
                        color = if (isSelected) priority.color.copy(alpha = 0.1f)
                            else MaterialTheme.colorScheme.surface,
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            PriorityDot(priority, size = PriorityDotSize.Large)
                            Spacer(Modifier.width(12.dp))
                            Text(
                                priority.label,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(selected) },
                enabled = selected != currentPriority,
            ) { Text("Confirm") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
    )
}
