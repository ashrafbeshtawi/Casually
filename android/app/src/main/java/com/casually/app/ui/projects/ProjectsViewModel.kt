package com.casually.app.ui.projects

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.LongRunningTask
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProjectsUiState(
    val isLoading: Boolean = true,
    val projects: List<LongRunningTask> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class ProjectsViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProjectsUiState())
    val uiState = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val projects = taskRepository.getLongTasks()
                _uiState.value = ProjectsUiState(isLoading = false, projects = projects)
            } catch (e: Exception) {
                _uiState.value = ProjectsUiState(
                    isLoading = false,
                    error = e.message ?: "Failed to load",
                )
            }
        }
    }

    fun createProject(title: String, description: String?, emoji: String?, priority: String, state: String) {
        viewModelScope.launch {
            try {
                taskRepository.createLongTask(title, description, emoji, priority, state)
                refresh()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }

    fun deleteProject(id: String) {
        viewModelScope.launch {
            try {
                taskRepository.deleteLongTask(id)
                refresh()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }
}
