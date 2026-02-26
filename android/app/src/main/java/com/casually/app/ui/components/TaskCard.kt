package com.casually.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.ShortRunningTask

@Composable
fun TaskCard(
    task: ShortRunningTask,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (task.emoji != null) {
                Text(task.emoji, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.width(8.dp))
            }
            Text(
                task.title,
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(8.dp))
            PriorityDot(task.priority)
            Spacer(Modifier.width(8.dp))
            StateBadge(task.state)
        }
    }
}
