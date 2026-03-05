package com.casually.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.casually.app.data.repository.AuthRepository
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.ShortRunningTask
import com.casually.app.ui.components.TaskFormSheet
import com.casually.app.ui.dashboard.DashboardScreen
import com.casually.app.ui.login.LoginScreen
import com.casually.app.ui.projectdetail.ProjectDetailScreen
import com.casually.app.ui.settings.SettingsScreen
import com.casually.app.ui.theme.ThemeMode
import com.casually.app.widget.WidgetRefreshWorker
import kotlinx.coroutines.launch

enum class BottomNavItem(val route: String, val label: String, val icon: ImageVector) {
    Dashboard("dashboard", "Dashboard", Icons.Default.Dashboard),
    Settings("settings", "Settings", Icons.Default.Settings),
}

@Composable
fun AppNavigation(
    authRepository: AuthRepository,
    taskRepository: TaskRepository,
    themeMode: ThemeMode = ThemeMode.SYSTEM,
    onThemeModeChange: (ThemeMode) -> Unit = {},
) {
    val navController = rememberNavController()
    val startRoute = if (authRepository.isLoggedIn) "main" else "login"

    // Bottom sheet states
    var showCreateProject by remember { mutableStateOf(false) }
    var showCreateTask by remember { mutableStateOf<String?>(null) }
    var showEditProject by remember { mutableStateOf<LongRunningTask?>(null) }
    var showEditTask by remember { mutableStateOf<Pair<ShortRunningTask, String>?>(null) }
    val scope = rememberCoroutineScope()

    var dashboardRefreshTrigger by remember { mutableIntStateOf(0) }
    val context = LocalContext.current

    // Refresh widget whenever dashboard data changes
    LaunchedEffect(dashboardRefreshTrigger) {
        if (dashboardRefreshTrigger > 0) {
            WidgetRefreshWorker.refreshNow(context)
        }
    }

    NavHost(navController = navController, startDestination = startRoute) {
        composable("login") {
            LoginScreen(onLoginSuccess = {
                WidgetRefreshWorker.refreshNow(context)
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
                            onCreateProject = { showCreateProject = true },
                            onCreateTask = { parentId -> showCreateTask = parentId },
                            onEditProject = { project -> showEditProject = project },
                            onEditTask = { task, parentId -> showEditTask = Pair(task, parentId) },
                            refreshTrigger = dashboardRefreshTrigger,
                        )
                    }
                    composable(BottomNavItem.Settings.route) {
                        SettingsScreen(
                            authRepository = authRepository,
                            themeMode = themeMode,
                            onThemeModeChange = onThemeModeChange,
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
                    dashboardRefreshTrigger++
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
                    dashboardRefreshTrigger++
                }
            },
        )
    }

    // Edit project bottom sheet
    showEditProject?.let { project ->
        TaskFormSheet(
            title = "Edit Project",
            initialTitle = project.title,
            initialDescription = project.description ?: "",
            initialEmoji = project.emoji ?: "",
            initialPriority = project.priority,
            initialState = project.state,
            showStateField = false,
            onDismiss = { showEditProject = null },
            onSubmit = { title, desc, emoji, priority, _ ->
                scope.launch {
                    taskRepository.updateLongTask(
                        project.id,
                        title = title,
                        description = desc,
                        emoji = emoji,
                        priority = priority,
                    )
                    showEditProject = null
                    dashboardRefreshTrigger++
                }
            },
        )
    }

    // Edit task bottom sheet
    showEditTask?.let { (task, _) ->
        TaskFormSheet(
            title = "Edit Task",
            initialTitle = task.title,
            initialDescription = task.description ?: "",
            initialEmoji = task.emoji ?: "",
            initialPriority = task.priority,
            showStateField = false,
            onDismiss = { showEditTask = null },
            onSubmit = { title, desc, emoji, priority, _ ->
                scope.launch {
                    taskRepository.updateShortTask(
                        task.id,
                        title = title,
                        description = desc,
                        emoji = emoji,
                        priority = priority,
                    )
                    showEditTask = null
                    dashboardRefreshTrigger++
                }
            },
        )
    }
}
