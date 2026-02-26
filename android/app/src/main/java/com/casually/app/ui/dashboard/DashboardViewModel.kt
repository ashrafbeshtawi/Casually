package com.casually.app.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.ShortRunningTask
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardGroup(
    val project: LongRunningTask,
    val tasks: List<ShortRunningTask>,
)

data class DashboardUiState(
    val isLoading: Boolean = true,
    val groups: List<DashboardGroup> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val projects = taskRepository.getLongTasks(state = "ACTIVE")
                val tasks = taskRepository.getShortTasks(state = "ACTIVE")
                val tasksByParent = tasks.groupBy { it.parentId }

                val groups = projects
                    .filter { tasksByParent.containsKey(it.id) }
                    .map { project ->
                        DashboardGroup(project, tasksByParent[project.id] ?: emptyList())
                    }

                _uiState.value = DashboardUiState(isLoading = false, groups = groups)
            } catch (e: Exception) {
                _uiState.value = DashboardUiState(
                    isLoading = false,
                    error = e.message ?: "Failed to load",
                )
            }
        }
    }
}
