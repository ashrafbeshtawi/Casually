package com.casually.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.LongRunningTask

@Composable
fun ProjectCard(
    task: LongRunningTask,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        border = BorderStroke(2.dp, task.priority.color),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (task.emoji != null) {
                    Text(task.emoji, style = MaterialTheme.typography.headlineSmall)
                    Spacer(Modifier.width(8.dp))
                }
                Text(
                    task.title,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f),
                )
            }
            if (task.description != null) {
                Spacer(Modifier.height(4.dp))
                Text(
                    task.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                )
            }
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                StateBadge(task.state)
                Spacer(Modifier.weight(1f))
                val childCount = task.count?.children ?: task.children?.size ?: 0
                if (childCount > 0) {
                    Text(
                        "$childCount tasks",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
