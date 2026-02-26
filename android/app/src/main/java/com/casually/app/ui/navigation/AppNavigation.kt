package com.casually.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.casually.app.data.repository.AuthRepository
import com.casually.app.data.repository.TaskRepository
import com.casually.app.ui.components.TaskFormSheet
import com.casually.app.ui.dashboard.DashboardScreen
import com.casually.app.ui.login.LoginScreen
import com.casually.app.ui.projectdetail.ProjectDetailScreen
import com.casually.app.ui.projects.ProjectsScreen
import com.casually.app.ui.settings.SettingsScreen
import kotlinx.coroutines.launch

enum class BottomNavItem(val route: String, val label: String, val icon: ImageVector) {
    Dashboard("dashboard", "Dashboard", Icons.Default.Dashboard),
    Projects("projects", "Projects", Icons.Default.Folder),
    Settings("settings", "Settings", Icons.Default.Settings),
}

@Composable
fun AppNavigation(
    authRepository: AuthRepository,
    taskRepository: TaskRepository,
) {
    val navController = rememberNavController()
    val startRoute = if (authRepository.isLoggedIn) "main" else "login"

    // Bottom sheet state
    var showCreateProject by remember { mutableStateOf(false) }
    var showCreateTask by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    NavHost(navController = navController, startDestination = startRoute) {
        composable("login") {
            LoginScreen(onLoginSuccess = {
                navController.navigate("main") {
                    popUpTo("login") { inclusive = true }
                }
            })
        }

        composable("main") {
            val bottomNavController = rememberNavController()
            val currentBackStack by bottomNavController.currentBackStackEntryAsState()
            val currentRoute = currentBackStack?.destination?.route

            Scaffold(
                bottomBar = {
                    NavigationBar {
                        BottomNavItem.entries.forEach { item ->
                            NavigationBarItem(
                                icon = { Icon(item.icon, item.label) },
                                label = { Text(item.label) },
                                selected = currentRoute == item.route,
                                onClick = {
                                    bottomNavController.navigate(item.route) {
                                        popUpTo(bottomNavController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                            )
                        }
                    }
                }
            ) { padding ->
                NavHost(
                    navController = bottomNavController,
                    startDestination = BottomNavItem.Dashboard.route,
                    modifier = Modifier.padding(padding),
                ) {
                    composable(BottomNavItem.Dashboard.route) {
                        DashboardScreen(
                            onProjectClick = { id -> navController.navigate("project/$id") },
                        )
                    }
                    composable(BottomNavItem.Projects.route) {
                        ProjectsScreen(
                            onProjectClick = { id -> navController.navigate("project/$id") },
                            onCreateProject = { showCreateProject = true },
                        )
                    }
                    composable(BottomNavItem.Settings.route) {
                        SettingsScreen(
                            authRepository = authRepository,
                            onSignOut = {
                                navController.navigate("login") {
                                    popUpTo("main") { inclusive = true }
                                }
                            },
                        )
                    }
                }
            }
        }

        composable(
            "project/{projectId}",
            arguments = listOf(navArgument("projectId") { type = NavType.StringType }),
        ) {
            ProjectDetailScreen(
                onBack = { navController.popBackStack() },
                onAddTask = { parentId -> showCreateTask = parentId },
            )
        }
    }

    // Create project bottom sheet
    if (showCreateProject) {
        TaskFormSheet(
            title = "Create Project",
            showStateField = true,
            onDismiss = { showCreateProject = false },
            onSubmit = { title, desc, emoji, priority, state ->
                scope.launch {
                    taskRepository.createLongTask(title, desc, emoji, priority, state ?: "WAITING")
                    showCreateProject = false
                }
            },
        )
    }

    // Create task bottom sheet
    showCreateTask?.let { parentId ->
        TaskFormSheet(
            title = "Create Task",
            showStateField = false,
            onDismiss = { showCreateTask = null },
            onSubmit = { title, desc, emoji, priority, _ ->
                scope.launch {
                    taskRepository.createShortTask(parentId, title, desc, emoji, priority)
                    showCreateTask = null
                }
            },
        )
    }
}
