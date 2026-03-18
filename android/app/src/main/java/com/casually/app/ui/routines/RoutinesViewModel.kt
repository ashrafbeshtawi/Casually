package com.casually.app.ui.routines

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.Priority
import com.casually.app.domain.model.ShortRunningTask
import com.casually.app.domain.model.TaskState
import com.casually.app.domain.model.sortedByPriority
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RoutinesUiState(
    val isLoading: Boolean = true,
    val projectId: String? = null,
    val tasks: List<ShortRunningTask> = emptyList(),
    val allProjects: List<LongRunningTask> = emptyList(),
    val stateFilter: String = "ACTIVE",
    val recentlyChangedIds: Set<String> = emptySet(),
    val error: String? = null,
)

@HiltViewModel
class RoutinesViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RoutinesUiState())
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

    private fun silentRefresh() {
        viewModelScope.launch {
            try {
                val allProjects = taskRepository.getLongTasks()
                val project = allProjects.find { it.title == "Routines" }
                val tasks = if (project != null) {
                    val detail = taskRepository.getLongTask(project.id)
                    (detail.children ?: emptyList()).sortedByPriority { it.priority }
                } else {
                    emptyList()
                }
                _uiState.value = _uiState.value.copy(
                    projectId = project?.id,
                    tasks = tasks,
                    allProjects = allProjects,
                )
            } catch (_: Exception) {}
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val allProjects = taskRepository.getLongTasks()
                val project = allProjects.find { it.title == "Routines" }
                val tasks = if (project != null) {
                    val detail = taskRepository.getLongTask(project.id)
                    (detail.children ?: emptyList()).sortedByPriority { it.priority }
                } else {
                    emptyList()
                }
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    projectId = project?.id,
                    tasks = tasks,
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

    fun setFilter(filter: String) {
        _uiState.value = _uiState.value.copy(stateFilter = filter)
    }

    fun changeTaskState(taskId: String, state: String) {
        val newState = TaskState.valueOf(state)
        _uiState.value = _uiState.value.copy(
            tasks = _uiState.value.tasks.map { if (it.id == taskId) it.copy(state = newState) else it },
            recentlyChangedIds = _uiState.value.recentlyChangedIds + taskId,
        )
        viewModelScope.launch {
            delay(1200)
            _uiState.value = _uiState.value.copy(
                recentlyChangedIds = _uiState.value.recentlyChangedIds - taskId,
            )
        }
        viewModelScope.launch {
            try {
                taskRepository.changeShortTaskState(taskId, state)
            } catch (_: Exception) { refresh() }
        }
    }

    fun changeTaskPriority(taskId: String, priority: String) {
        val newPriority = Priority.valueOf(priority)
        _uiState.value = _uiState.value.copy(
            tasks = _uiState.value.tasks.map { if (it.id == taskId) it.copy(priority = newPriority) else it }
        )
        viewModelScope.launch {
            try {
                taskRepository.updateShortTask(taskId, priority = priority)
            } catch (_: Exception) { refresh() }
        }
    }

    fun deleteTask(taskId: String) {
        _uiState.value = _uiState.value.copy(
            tasks = _uiState.value.tasks.filter { it.id != taskId }
        )
        viewModelScope.launch {
            try {
                taskRepository.deleteShortTask(taskId)
            } catch (_: Exception) { refresh() }
        }
    }

    fun moveTask(taskId: String, toParentId: String) {
        viewModelScope.launch {
            try {
                taskRepository.moveShortTask(taskId, toParentId)
                refresh()
            } catch (_: Exception) {}
        }
    }
}
