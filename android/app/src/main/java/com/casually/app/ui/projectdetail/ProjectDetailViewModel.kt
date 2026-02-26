package com.casually.app.ui.projectdetail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.LongRunningTask
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProjectDetailUiState(
    val isLoading: Boolean = true,
    val project: LongRunningTask? = null,
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
                _uiState.value = ProjectDetailUiState(isLoading = false, project = project)
            } catch (e: Exception) {
                _uiState.value = ProjectDetailUiState(
                    isLoading = false,
                    error = e.message ?: "Failed to load",
                )
            }
        }
    }

    fun changeProjectState(state: String) {
        viewModelScope.launch {
            try {
                taskRepository.changeLongTaskState(projectId, state)
                refresh()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }

    fun changeTaskState(taskId: String, state: String) {
        viewModelScope.launch {
            try {
                taskRepository.changeShortTaskState(taskId, state)
                refresh()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }

    fun deleteTask(taskId: String) {
        viewModelScope.launch {
            try {
                taskRepository.deleteShortTask(taskId)
                refresh()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }
}
