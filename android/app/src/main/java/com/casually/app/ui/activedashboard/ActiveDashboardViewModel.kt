package com.casually.app.ui.activedashboard

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.Priority
import com.casually.app.domain.model.ShortRunningTask
import com.casually.app.domain.model.TaskState
import com.casually.app.domain.model.sortedByPriority
import com.casually.app.widget.WidgetRefreshWorker
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ActiveDashboardUiState(
    val isLoading: Boolean = true,
    val activeProjects: List<LongRunningTask> = emptyList(),
    val childrenByProject: Map<String, List<ShortRunningTask>> = emptyMap(),
    val collapsedProjects: Set<String> = emptySet(),
    val allProjects: List<LongRunningTask> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class ActiveDashboardViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
    @ApplicationContext private val appContext: Context,
) : ViewModel() {

    private fun refreshWidget() {
        WidgetRefreshWorker.refreshNow(appContext)
    }

    private val _uiState = MutableStateFlow(ActiveDashboardUiState())
    val uiState = _uiState.asStateFlow()

    init {
        refresh()
        startAutoRefresh()
    }

    private fun startAutoRefresh() {
        viewModelScope.launch {
            while (true) {
                delay(60 * 1000L) // 1 minute
                silentRefresh()
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val allProjects = taskRepository.getLongTasks()

                val activeTasks = taskRepository.getShortTasks(state = "ACTIVE")
                val tasksByParent = activeTasks.groupBy { it.parentId }

                // All active projects that have at least one active subtask, sorted by priority
                val activeProjects = allProjects.filter {
                    it.state == TaskState.ACTIVE && (tasksByParent[it.id] ?: emptyList()).isNotEmpty()
                }.sortedByPriority { it.priority }

                val childrenByProject = activeProjects.associate { project ->
                    project.id to (tasksByParent[project.id] ?: emptyList()).sortedByPriority { it.priority }
                }

                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    activeProjects = activeProjects,
                    childrenByProject = childrenByProject,
                    allProjects = allProjects,
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load",
                )
            }
        }
    }

    fun silentRefresh() {
        viewModelScope.launch {
            try {
                val allProjects = taskRepository.getLongTasks()

                val activeTasks = taskRepository.getShortTasks(state = "ACTIVE")
                val tasksByParent = activeTasks.groupBy { it.parentId }

                val activeProjects = allProjects.filter {
                    it.state == TaskState.ACTIVE && (tasksByParent[it.id] ?: emptyList()).isNotEmpty()
                }.sortedByPriority { it.priority }

                val childrenByProject = activeProjects.associate { project ->
                    project.id to (tasksByParent[project.id] ?: emptyList()).sortedByPriority { it.priority }
                }

                _uiState.value = _uiState.value.copy(
                    activeProjects = activeProjects,
                    childrenByProject = childrenByProject,
                    allProjects = allProjects,
                )
            } catch (_: Exception) {}
        }
    }

    fun toggleProjectCollapse(projectId: String) {
        val wasCollapsed = _uiState.value.collapsedProjects.contains(projectId)
        val newCollapsed = if (wasCollapsed) {
            _uiState.value.collapsedProjects - projectId
        } else {
            _uiState.value.collapsedProjects + projectId
        }
        _uiState.value = _uiState.value.copy(collapsedProjects = newCollapsed)
        // No server sync — collapse is local per panel
    }

    fun changeTaskState(taskId: String, parentId: String, state: String) {
        val newState = TaskState.valueOf(state)
        _uiState.value = _uiState.value.copy(
            childrenByProject = _uiState.value.childrenByProject.mapValues { (pid, tasks) ->
                if (pid == parentId) tasks.map { if (it.id == taskId) it.copy(state = newState) else it }
                else tasks
            },
        )
        viewModelScope.launch {
            try {
                taskRepository.changeShortTaskState(taskId, state)
                refreshWidget()
                delay(1200)
                silentRefresh()
            } catch (_: Exception) { refresh() }
        }
    }

    fun changeTaskPriority(taskId: String, parentId: String, priority: String) {
        val newPriority = Priority.valueOf(priority)
        _uiState.value = _uiState.value.copy(
            childrenByProject = _uiState.value.childrenByProject.mapValues { (pid, tasks) ->
                if (pid == parentId) tasks.map { if (it.id == taskId) it.copy(priority = newPriority) else it }
                    .sortedByPriority { it.priority }
                else tasks
            },
        )
        viewModelScope.launch {
            try {
                taskRepository.updateShortTask(taskId, priority = priority)
            } catch (_: Exception) { refresh() }
        }
    }

    fun deleteTask(taskId: String, parentId: String) {
        _uiState.value = _uiState.value.copy(
            childrenByProject = _uiState.value.childrenByProject.mapValues { (pid, tasks) ->
                if (pid == parentId) tasks.filter { it.id != taskId } else tasks
            },
        )
        viewModelScope.launch {
            try {
                taskRepository.deleteShortTask(taskId)
                refreshWidget()
            } catch (_: Exception) { refresh() }
        }
    }

    fun moveTask(taskId: String, fromParentId: String, toParentId: String) {
        viewModelScope.launch {
            try {
                taskRepository.moveShortTask(taskId, toParentId)
                refresh()
            } catch (_: Exception) {}
        }
    }
}
