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
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.ui.theme.CasuallyPurple

@Composable
fun MoveTaskDialog(
    projects: List<LongRunningTask>,
    currentParentId: String,
    onDismiss: () -> Unit,
    onConfirm: (targetProjectId: String) -> Unit,
) {
    val availableProjects = projects.filter { it.id != currentParentId }
    var selected by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Move to project") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (availableProjects.isEmpty()) {
                    Text(
                        "No other projects available",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    availableProjects.forEach { project ->
                        val isSelected = project.id == selected
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selected = project.id },
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(
                                width = if (isSelected) 2.dp else 1.dp,
                                color = if (isSelected) CasuallyPurple else MaterialTheme.colorScheme.outlineVariant,
                            ),
                            color = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                                else MaterialTheme.colorScheme.surface,
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                if (project.emoji != null) {
                                    Text(project.emoji, style = MaterialTheme.typography.titleMedium)
                                    Spacer(Modifier.width(10.dp))
                                }
                                Text(
                                    project.title,
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { selected?.let { onConfirm(it) } },
                enabled = selected != null,
            ) { Text("Move") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
    )
}
