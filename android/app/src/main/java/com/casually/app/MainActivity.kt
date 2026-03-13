package com.casually.app

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.*
import com.casually.app.data.repository.AuthRepository
import com.casually.app.data.repository.TaskRepository
import com.casually.app.ui.navigation.AppNavigation
import com.casually.app.ui.theme.CasuallyTheme
import com.casually.app.ui.theme.ThemeMode
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var authRepository: AuthRepository
    @Inject lateinit var taskRepository: TaskRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val deepLinkProjectId = intent.getStringExtra("project_id")
        val showCreateTaskIntent = intent.getBooleanExtra("show_create_task", false)

        setContent {
            val prefs = getSharedPreferences("casually_settings", Context.MODE_PRIVATE)
            var themeMode by remember {
                mutableStateOf(
                    try { ThemeMode.valueOf(prefs.getString("theme_mode", "SYSTEM") ?: "SYSTEM") }
                    catch (_: Exception) { ThemeMode.SYSTEM }
                )
            }

            CasuallyTheme(themeMode = themeMode) {
                AppNavigation(
                    authRepository = authRepository,
                    taskRepository = taskRepository,
                    themeMode = themeMode,
                    onThemeModeChange = { mode ->
                        themeMode = mode
                        prefs.edit().putString("theme_mode", mode.name).apply()
                    },
                    initialProjectId = deepLinkProjectId,
                    showCreateTask = showCreateTaskIntent,
                )
            }
        }
    }
}
