package com.casually.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.Priority

enum class PriorityDotSize(val dp: Dp) {
    Small(8.dp),
    Medium(12.dp),
    Large(16.dp),
}

@Composable
fun PriorityDot(
    priority: Priority,
    modifier: Modifier = Modifier,
    size: PriorityDotSize = PriorityDotSize.Small,
    showLabel: Boolean = false,
) {
    if (showLabel) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = modifier
                    .size(size.dp)
                    .clip(CircleShape)
                    .background(priority.color)
            )
            Spacer(Modifier.width(6.dp))
            Text(
                priority.label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    } else {
        Box(
            modifier = modifier
                .size(size.dp)
                .clip(CircleShape)
                .background(priority.color)
        )
    }
}
