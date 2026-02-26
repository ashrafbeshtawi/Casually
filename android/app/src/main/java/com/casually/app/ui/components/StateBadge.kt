package com.casually.app.ui.components

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.casually.app.domain.model.TaskState

@Composable
fun StateBadge(state: TaskState, modifier: Modifier = Modifier) {
    val colors = when (state) {
        TaskState.ACTIVE -> AssistChipDefaults.assistChipColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
            labelColor = MaterialTheme.colorScheme.onPrimaryContainer,
        )
        TaskState.WAITING -> AssistChipDefaults.assistChipColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer,
            labelColor = MaterialTheme.colorScheme.onSecondaryContainer,
        )
        TaskState.BLOCKED -> AssistChipDefaults.assistChipColors(
            containerColor = MaterialTheme.colorScheme.errorContainer,
            labelColor = MaterialTheme.colorScheme.onErrorContainer,
        )
        TaskState.DONE -> AssistChipDefaults.assistChipColors(
            containerColor = MaterialTheme.colorScheme.tertiaryContainer,
            labelColor = MaterialTheme.colorScheme.onTertiaryContainer,
        )
    }

    AssistChip(
        onClick = {},
        label = { Text(state.label) },
        modifier = modifier,
        colors = colors,
    )
}
