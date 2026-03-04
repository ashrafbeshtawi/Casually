package com.casually.app.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.TaskState
import com.casually.app.ui.theme.*

@Composable
fun StateBadge(state: TaskState, modifier: Modifier = Modifier) {
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f

    val (bgColor, textColor) = when (state) {
        TaskState.ACTIVE -> if (isDark) Color(0xFF1A4D2E) to StateGreenDark else Color(0xFFDCFCE7) to Color(0xFF166534)
        TaskState.WAITING -> if (isDark) Color(0xFF4D3B00) to StateAmberDark else Color(0xFFFEF9C3) to Color(0xFF854D0E)
        TaskState.BLOCKED -> if (isDark) Color(0xFF5C1A1A) to StateRedDark else Color(0xFFFEE2E2) to Color(0xFF991B1B)
        TaskState.DONE -> if (isDark) Color(0xFF2B2930) to StateGrayDark else Color(0xFFF3F4F6) to Color(0xFF4B5563)
    }

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        color = bgColor,
    ) {
        Text(
            state.label,
            style = MaterialTheme.typography.labelSmall,
            color = textColor,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}

private fun Color.luminance(): Float {
    val r = red * 0.2126f
    val g = green * 0.7152f
    val b = blue * 0.0722f
    return r + g + b
}
