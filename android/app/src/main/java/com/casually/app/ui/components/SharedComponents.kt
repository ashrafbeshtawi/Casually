package com.casually.app.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DriveFileMove
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.Priority
import com.casually.app.domain.model.ShortRunningTask
import com.casually.app.domain.model.TaskState
import com.casually.app.ui.theme.CasuallyPurple

val PROTECTED_TITLES = listOf("One-Off Tasks", "Routines")

val DEFAULT_FILTER_OPTIONS = listOf(
    "ALL" to "All",
    "ACTIVE" to "Active",
    "WAITING" to "Waiting",
    "BLOCKED" to "Blocked",
    "DONE" to "Done",
)

@Composable
fun FilterChipRow(
    label: String,
    selectedValue: String,
    options: List<Pair<String, String>>,
    onSelect: (String) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        options.forEach { (value, displayLabel) ->
            val isSelected = value == selectedValue
            Surface(
                onClick = { onSelect(value) },
                shape = RoundedCornerShape(20.dp),
                color = if (isSelected) CasuallyPurple else MaterialTheme.colorScheme.surfaceContainer,
            ) {
                Text(
                    displayLabel,
                    style = MaterialTheme.typography.labelMedium,
                    color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
        }
    }
}

@Composable
fun ProjectHeader(
    project: LongRunningTask,
    isExpanded: Boolean,
    childCount: Int,
    isProtected: Boolean,
    isFirst: Boolean = false,
    isLast: Boolean = false,
    onToggle: () -> Unit,
    onAddTask: () -> Unit,
    onChangeState: (TaskState) -> Unit,
    onChangePriority: (Priority) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    val borderColor = project.priority.color
    val chevronRotation by animateFloatAsState(
        targetValue = if (isExpanded) 90f else 0f,
        animationSpec = tween(200),
        label = "chevron",
    )
    var showStateMenu by remember { mutableStateOf(false) }
    var showPriorityMenu by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .drawBehind {
                drawLine(
                    color = borderColor,
                    start = Offset(0f, 0f),
                    end = Offset(0f, size.height),
                    strokeWidth = 8.dp.toPx(),
                )
            },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column {
            Row(
                modifier = Modifier
                    .clickable { onToggle() }
                    .padding(start = 12.dp, end = 4.dp, top = 10.dp, bottom = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = if (isExpanded) "Collapse" else "Expand",
                    modifier = Modifier
                        .size(20.dp)
                        .rotate(chevronRotation),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.width(4.dp))
                if (project.emoji != null) {
                    Text(project.emoji, style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.width(6.dp))
                }
                Text(
                    project.title,
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.weight(1f),
                )
                Box {
                    Surface(
                        onClick = { showStateMenu = true },
                        shape = RoundedCornerShape(20.dp),
                        color = Color.Transparent,
                    ) {
                        StateBadge(project.state)
                    }
                    DropdownMenu(
                        expanded = showStateMenu,
                        onDismissRequest = { showStateMenu = false },
                    ) {
                        TaskState.validTransitions(project.state).forEach { state ->
                            DropdownMenuItem(
                                text = { StateBadge(state) },
                                onClick = {
                                    showStateMenu = false
                                    onChangeState(state)
                                },
                            )
                        }
                    }
                }
                Box {
                    Surface(
                        onClick = { showPriorityMenu = true },
                        shape = RoundedCornerShape(12.dp),
                        color = Color.Transparent,
                    ) {
                        Box(
                            modifier = Modifier.size(28.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            PriorityDot(project.priority, size = PriorityDotSize.Medium)
                        }
                    }
                    DropdownMenu(
                        expanded = showPriorityMenu,
                        onDismissRequest = { showPriorityMenu = false },
                    ) {
                        Priority.entries.forEach { priority ->
                            DropdownMenuItem(
                                text = { PriorityDot(priority, showLabel = true) },
                                onClick = {
                                    showPriorityMenu = false
                                    onChangePriority(priority)
                                },
                            )
                        }
                    }
                }
                Box {
                    IconButton(onClick = { showMenu = true }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.MoreVert, "More options", Modifier.size(20.dp))
                    }
                    DropdownMenu(
                        expanded = showMenu,
                        onDismissRequest = { showMenu = false },
                    ) {
                        DropdownMenuItem(
                            text = { Text("Add task") },
                            onClick = { showMenu = false; onAddTask() },
                            leadingIcon = { Icon(Icons.Default.Add, null, Modifier.size(18.dp)) },
                        )
                        if (!isProtected) {
                            DropdownMenuItem(
                                text = { Text("Edit") },
                                onClick = { showMenu = false; onEdit() },
                                leadingIcon = { Icon(Icons.Default.Edit, null, Modifier.size(18.dp)) },
                            )
                            DropdownMenuItem(
                                text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                                onClick = { showMenu = false; onDelete() },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.Delete, null,
                                        Modifier.size(18.dp),
                                        tint = MaterialTheme.colorScheme.error,
                                    )
                                },
                            )
                        }
                    }
                }
            }

            AnimatedVisibility(
                visible = isExpanded && !isProtected && project.description != null,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically(),
            ) {
                project.description?.let {
                    Text(
                        it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(start = 40.dp, end = 12.dp, bottom = 8.dp),
                    )
                }
            }
        }
    }
}

@Composable
fun TaskRow(
    task: ShortRunningTask,
    modifier: Modifier = Modifier,
    minimal: Boolean = false,
    showEdit: Boolean = true,
    onChangeState: (TaskState) -> Unit = {},
    onChangePriority: (Priority) -> Unit = {},
    onEdit: () -> Unit = {},
    onDelete: () -> Unit = {},
    onMove: () -> Unit = {},
) {
    val borderColor = task.priority.color
    var showMenu by remember { mutableStateOf(false) }
    var showStateMenu by remember { mutableStateOf(false) }
    var showPriorityMenu by remember { mutableStateOf(false) }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = 24.dp, end = 0.dp, top = 2.dp, bottom = 2.dp)
            .drawBehind {
                drawLine(
                    color = borderColor,
                    start = Offset(0f, size.height * 0.2f),
                    end = Offset(0f, size.height * 0.8f),
                    strokeWidth = 4.dp.toPx(),
                )
            },
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(modifier = Modifier.padding(start = 10.dp, end = if (minimal) 12.dp else 4.dp, top = 8.dp, bottom = 8.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (task.emoji != null) {
                Text(task.emoji, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.width(6.dp))
            }
            Text(
                task.title,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f),
            )

            if (!minimal) {
                Box {
                    Surface(
                        onClick = { showPriorityMenu = true },
                        shape = RoundedCornerShape(12.dp),
                        color = Color.Transparent,
                    ) {
                        Box(
                            modifier = Modifier.size(32.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            PriorityDot(task.priority, size = PriorityDotSize.Medium)
                        }
                    }
                    DropdownMenu(
                        expanded = showPriorityMenu,
                        onDismissRequest = { showPriorityMenu = false },
                    ) {
                        Priority.entries.forEach { priority ->
                            DropdownMenuItem(
                                text = { PriorityDot(priority, showLabel = true) },
                                onClick = {
                                    showPriorityMenu = false
                                    onChangePriority(priority)
                                },
                            )
                        }
                    }
                }

                Box {
                    Surface(
                        onClick = { showStateMenu = true },
                        shape = RoundedCornerShape(20.dp),
                        color = Color.Transparent,
                    ) {
                        Box(modifier = Modifier.padding(horizontal = 2.dp, vertical = 4.dp)) {
                            StateBadge(task.state)
                        }
                    }
                    DropdownMenu(
                        expanded = showStateMenu,
                        onDismissRequest = { showStateMenu = false },
                    ) {
                        TaskState.validTransitions(task.state).forEach { state ->
                            DropdownMenuItem(
                                text = { StateBadge(state) },
                                onClick = {
                                    showStateMenu = false
                                    onChangeState(state)
                                },
                            )
                        }
                    }
                }

                Box {
                    IconButton(onClick = { showMenu = true }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.MoreVert, "More options", Modifier.size(20.dp))
                    }
                    DropdownMenu(
                        expanded = showMenu,
                        onDismissRequest = { showMenu = false },
                    ) {
                        if (showEdit) {
                            DropdownMenuItem(
                                text = { Text("Edit") },
                                onClick = { showMenu = false; onEdit() },
                                leadingIcon = { Icon(Icons.Default.Edit, null, Modifier.size(18.dp)) },
                            )
                        }
                        DropdownMenuItem(
                            text = { Text("Move to\u2026") },
                            onClick = { showMenu = false; onMove() },
                            leadingIcon = { Icon(Icons.AutoMirrored.Filled.DriveFileMove, null, Modifier.size(18.dp)) },
                        )
                        DropdownMenuItem(
                            text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                            onClick = { showMenu = false; onDelete() },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.Delete, null,
                                    Modifier.size(18.dp),
                                    tint = MaterialTheme.colorScheme.error,
                                )
                            },
                        )
                    }
                }
            }
        }
        if (!minimal && task.description != null) {
            Text(
                task.description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
        }
    }
}
