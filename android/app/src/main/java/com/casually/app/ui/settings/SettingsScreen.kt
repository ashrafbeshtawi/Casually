package com.casually.app.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.casually.app.data.repository.AuthRepository

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    authRepository: AuthRepository,
    onSignOut: () -> Unit,
) {
    Scaffold(
        topBar = { TopAppBar(title = { Text("Settings") }) }
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        authRepository.userName ?: "User",
                        style = MaterialTheme.typography.titleMedium,
                    )
                    if (authRepository.userEmail != null) {
                        Text(
                            authRepository.userEmail!!,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
            OutlinedButton(
                onClick = {
                    authRepository.signOut()
                    onSignOut()
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Sign Out") }
        }
    }
}
