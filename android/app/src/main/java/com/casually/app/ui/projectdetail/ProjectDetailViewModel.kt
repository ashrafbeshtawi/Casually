package com.casually.app.ui.projectdetail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.Priority
import com.casually.app.domain.model.TaskState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProjectDetailUiState(
    val isLoading: Boolean = true,
    val project: LongRunningTask? = null,
    val allProjects: List<LongRunningTask> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class ProjectDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val taskRepository: TaskRepository,
) : ViewModel() {

    private val projectId: String = savedStateHandle["projectId"]!!

    private val _uiState = MutableStateFlow(ProjectDetailUiState())
    val uiState = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val project = taskRepository.getLongTask(projectId)
                val allProjects = taskRepository.getLongTasks()
                _uiState.value = ProjectDetailUiState(
                    isLoading = false,
                    project = project,
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

    fun changeProjectState(state: String) {
        val newState = TaskState.valueOf(state)
        _uiState.value = _uiState.value.copy(
            project = _uiState.value.project?.copy(state = newState),
        )
        viewModelScope.launch {
            try {
                taskRepository.changeLongTaskState(projectId, state)
                refresh()
            } catch (_: Exception) { refresh() }
        }
    }

    fun changeProjectPriority(priority: String) {
        val newPriority = Priority.valueOf(priority)
        _uiState.value = _uiState.value.copy(
            project = _uiState.value.project?.copy(priority = newPriority),
        )
        viewModelScope.launch {
            try {
                taskRepository.updateLongTask(projectId, priority = priority)
            } catch (_: Exception) { refresh() }
        }
    }

    fun changeTaskState(taskId: String, state: String) {
        val newState = TaskState.valueOf(state)
        val project = _uiState.value.project ?: return
        _uiState.value = _uiState.value.copy(
            project = project.copy(
                children = project.children?.map {
                    if (it.id == taskId) it.copy(state = newState) else it
                },
            ),
        )
        viewModelScope.launch {
            try {
                taskRepository.changeShortTaskState(taskId, state)
            } catch (_: Exception) { refresh() }
        }
    }

    fun changeTaskPriority(taskId: String, priority: String) {
        val newPriority = Priority.valueOf(priority)
        val project = _uiState.value.project ?: return
        _uiState.value = _uiState.value.copy(
            project = project.copy(
                children = project.children?.map {
                    if (it.id == taskId) it.copy(priority = newPriority) else it
                },
            ),
        )
        viewModelScope.launch {
            try {
                taskRepository.updateShortTask(taskId, priority = priority)
            } catch (_: Exception) { refresh() }
        }
    }

    fun deleteTask(taskId: String) {
        val project = _uiState.value.project ?: return
        _uiState.value = _uiState.value.copy(
            project = project.copy(
                children = project.children?.filter { it.id != taskId },
            ),
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
            } catch (_: Exception) { refresh() }
        }
    }
}
