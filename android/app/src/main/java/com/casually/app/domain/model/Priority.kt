package com.casually.app.domain.model

import androidx.compose.ui.graphics.Color

enum class Priority(val label: String, val color: Color, val sortOrder: Int) {
    HIGHEST("Highest", Color(0xFFEF4444), 0),
    HIGH("High", Color(0xFFF97316), 1),
    MEDIUM("Medium", Color(0xFFEAB308), 2),
    LOW("Low", Color(0xFF3B82F6), 3),
    LOWEST("Lowest", Color(0xFF22C55E), 4);
}

fun <T> List<T>.sortedByPriority(priorityOf: (T) -> Priority): List<T> =
    sortedBy { priorityOf(it).sortOrder }
