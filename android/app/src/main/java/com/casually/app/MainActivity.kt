package com.casually.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.casually.app.data.repository.AuthRepository
import com.casually.app.data.repository.TaskRepository
import com.casually.app.ui.navigation.AppNavigation
import com.casually.app.ui.theme.CasuallyTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var authRepository: AuthRepository
    @Inject lateinit var taskRepository: TaskRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CasuallyTheme {
                AppNavigation(
                    authRepository = authRepository,
                    taskRepository = taskRepository,
                )
            }
        }
    }
}
