package com.casually.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.Priority

@Composable
fun PriorityDot(priority: Priority, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(8.dp)
            .clip(CircleShape)
            .background(priority.color)
    )
}
