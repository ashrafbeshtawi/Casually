package com.casually.app.domain.model

import androidx.compose.ui.graphics.Color

enum class Priority(val label: String, val color: Color) {
    HIGHEST("Highest", Color(0xFFEF4444)),
    HIGH("High", Color(0xFFF97316)),
    MEDIUM("Medium", Color(0xFFEAB308)),
    LOW("Low", Color(0xFF3B82F6)),
    LOWEST("Lowest", Color(0xFF22C55E));
}
