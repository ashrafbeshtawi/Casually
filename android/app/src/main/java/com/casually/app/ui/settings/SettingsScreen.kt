package com.casually.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.casually.app.BuildConfig
import com.casually.app.data.repository.AuthRepository
import com.casually.app.domain.model.ApiToken
import com.casually.app.ui.theme.CasuallyPurple
import com.casually.app.ui.theme.ThemeMode

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    authRepository: AuthRepository,
    themeMode: ThemeMode,
    onThemeModeChange: (ThemeMode) -> Unit,
    onSignOut: () -> Unit,
    onBack: (() -> Unit)? = null,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                },
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            // Profile card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    // Avatar
                    val imageUrl = authRepository.userImage
                    if (imageUrl != null) {
                        AsyncImage(
                            model = imageUrl,
                            contentDescription = "Profile picture",
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape),
                            contentScale = ContentScale.Crop,
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(CasuallyPurple),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                (authRepository.userName?.firstOrNull() ?: 'U').uppercase(),
                                color = MaterialTheme.colorScheme.onPrimary,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }

                    Spacer(Modifier.width(16.dp))

                    Column {
                        Text(
                            authRepository.userName ?: "User",
                            style = MaterialTheme.typography.titleMedium,
                        )
                        if (authRepository.userEmail != null) {
                            Text(
                                authRepository.userEmail!!,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }

            // Appearance section
            Text(
                "APPEARANCE",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    SettingsRow(
                        icon = Icons.Default.Palette,
                        title = "Theme",
                    )
                    Spacer(Modifier.height(12.dp))
                    SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                        ThemeMode.entries.forEachIndexed { index, mode ->
                            SegmentedButton(
                                shape = SegmentedButtonDefaults.itemShape(index, ThemeMode.entries.size),
                                onClick = { onThemeModeChange(mode) },
                                selected = themeMode == mode,
                                icon = {},
                            ) {
                                val icon = when (mode) {
                                    ThemeMode.SYSTEM -> Icons.Default.SettingsBrightness
                                    ThemeMode.LIGHT -> Icons.Default.LightMode
                                    ThemeMode.DARK -> Icons.Default.DarkMode
                                }
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center,
                                ) {
                                    Icon(icon, null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(mode.name.lowercase().replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelSmall)
                                }
                            }
                        }
                    }
                }
            }

            // MCP access tokens section
            Text(
                "MCP ACCESS",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            McpTokensSection(
                uiState = uiState,
                onCreate = viewModel::createToken,
                onRevoke = viewModel::revokeToken,
                onDismissNewToken = viewModel::dismissNewToken,
            )

            // About section
            Text(
                "ABOUT",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    SettingsRow(
                        icon = Icons.Default.Info,
                        title = "Version",
                        subtitle = "1.0.0",
                    )
                }
            }

            // Sign out
            OutlinedButton(
                onClick = {
                    authRepository.signOut()
                    onSignOut()
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = MaterialTheme.colorScheme.error,
                ),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    MaterialTheme.colorScheme.error.copy(alpha = 0.5f),
                ),
            ) {
                Icon(Icons.AutoMirrored.Filled.Logout, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Sign Out")
            }
        }
    }
}

@Composable
private fun McpTokensSection(
    uiState: SettingsUiState,
    onCreate: (String) -> Unit,
    onRevoke: (String) -> Unit,
    onDismissNewToken: () -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var tokenToRevoke by remember { mutableStateOf<ApiToken?>(null) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            SettingsRow(
                icon = Icons.Default.Key,
                title = "MCP Access Tokens",
                subtitle = "Connect AI assistants like Claude to your tasks. Tokens are long-lived and grant full access to your data — keep them secret.",
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Token name") },
                    placeholder = { Text("e.g. Claude Desktop") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                Spacer(Modifier.width(8.dp))
                Button(
                    onClick = {
                        onCreate(name)
                        name = ""
                    },
                    enabled = !uiState.isCreating,
                ) {
                    Text(if (uiState.isCreating) "Creating..." else "Create")
                }
            }

            uiState.newToken?.token?.let { token ->
                NewTokenCard(token = token, onDismiss = onDismissNewToken)
            }

            if (uiState.error != null) {
                Text(
                    uiState.error,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }

            when {
                uiState.isLoadingTokens -> {
                    CircularProgressIndicator(
                        modifier = Modifier
                            .size(24.dp)
                            .align(Alignment.CenterHorizontally),
                    )
                }
                uiState.tokens.isEmpty() -> {
                    Text(
                        "No tokens yet.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                else -> {
                    uiState.tokens.forEachIndexed { index, token ->
                        if (index > 0) HorizontalDivider()
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(token.name, style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    "Created ${token.createdAt.take(10)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            IconButton(onClick = { tokenToRevoke = token }) {
                                Icon(
                                    Icons.Default.Delete,
                                    contentDescription = "Revoke",
                                    tint = MaterialTheme.colorScheme.error,
                                    modifier = Modifier.size(18.dp),
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    tokenToRevoke?.let { token ->
        AlertDialog(
            onDismissRequest = { tokenToRevoke = null },
            title = { Text("Revoke token?") },
            text = { Text("“${token.name}” will stop working immediately. Any MCP client using it will lose access.") },
            confirmButton = {
                TextButton(onClick = {
                    onRevoke(token.id)
                    tokenToRevoke = null
                }) {
                    Text("Revoke", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { tokenToRevoke = null }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun NewTokenCard(token: String, onDismiss: () -> Unit) {
    val clipboard = LocalClipboardManager.current
    val mcpCommand =
        "claude mcp add --transport http casually ${BuildConfig.API_BASE_URL}/api/mcp --header \"Authorization: Bearer $token\""

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer),
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                "Copy your token now — it won't be shown again.",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.SemiBold,
            )
            CopyableValue(label = "Token", value = token) {
                clipboard.setText(AnnotatedString(token))
            }
            CopyableValue(label = "Add to Claude Code", value = mcpCommand) {
                clipboard.setText(AnnotatedString(mcpCommand))
            }
            TextButton(
                onClick = onDismiss,
                modifier = Modifier.align(Alignment.End),
            ) {
                Text("Done")
            }
        }
    }
}

@Composable
private fun CopyableValue(label: String, value: String, onCopy: () -> Unit) {
    Column {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                value,
                style = MaterialTheme.typography.bodySmall,
                fontFamily = FontFamily.Monospace,
                maxLines = 2,
                modifier = Modifier.weight(1f),
            )
            IconButton(onClick = onCopy) {
                Icon(
                    Icons.Default.ContentCopy,
                    contentDescription = "Copy $label",
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

@Composable
private fun SettingsRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String? = null,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            icon,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.width(12.dp))
        Column {
            Text(title, style = MaterialTheme.typography.bodyMedium)
            if (subtitle != null) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
