package com.casually.app.ui.dashboard

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.Priority
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

data class DashboardUiState(
    val isLoading: Boolean = true,
    val projects: List<LongRunningTask> = emptyList(),
    val projectStateFilter: String = "ACTIVE",
    val recentlyChangedProjectIds: Set<String> = emptySet(),
    val error: String? = null,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
    @ApplicationContext private val appContext: Context,
) : ViewModel() {

    private fun refreshWidget() {
        WidgetRefreshWorker.refreshNow(appContext)
    }

    private val _uiState = MutableStateFlow(DashboardUiState())
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

    fun silentRefresh() {
        viewModelScope.launch {
            try {
                val projects = taskRepository.getLongTasks()
                    .sortedByPriority { it.priority }
                _uiState.value = _uiState.value.copy(projects = projects)
            } catch (_: Exception) {}
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val projects = taskRepository.getLongTasks()
                    .sortedByPriority { it.priority }
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    projects = projects,
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load",
                )
            }
        }
    }

    fun setProjectFilter(filter: String) {
        _uiState.value = _uiState.value.copy(projectStateFilter = filter)
    }

    // Project actions (optimistic)
    fun changeProjectState(projectId: String, state: String) {
        val newState = TaskState.valueOf(state)
        _uiState.value = _uiState.value.copy(
            projects = _uiState.value.projects.map {
                if (it.id == projectId) it.copy(state = newState) else it
            },
            recentlyChangedProjectIds = _uiState.value.recentlyChangedProjectIds + projectId,
        )
        viewModelScope.launch {
            delay(1200)
            _uiState.value = _uiState.value.copy(
                recentlyChangedProjectIds = _uiState.value.recentlyChangedProjectIds - projectId,
            )
        }
        viewModelScope.launch {
            try {
                taskRepository.changeLongTaskState(projectId, state)
                refreshWidget()
            } catch (_: Exception) { refresh() }
        }
    }

    fun changeProjectPriority(projectId: String, priority: String) {
        val newPriority = Priority.valueOf(priority)
        _uiState.value = _uiState.value.copy(
            projects = _uiState.value.projects.map {
                if (it.id == projectId) it.copy(priority = newPriority) else it
            }.sortedByPriority { it.priority }
        )
        viewModelScope.launch {
            try {
                taskRepository.updateLongTask(projectId, priority = priority)
            } catch (_: Exception) { refresh() }
        }
    }

    fun deleteProject(projectId: String) {
        _uiState.value = _uiState.value.copy(
            projects = _uiState.value.projects.filter { it.id != projectId },
        )
        viewModelScope.launch {
            try {
                taskRepository.deleteLongTask(projectId)
                refreshWidget()
            } catch (_: Exception) { refresh() }
        }
    }

    fun createProject(title: String, description: String?, emoji: String?, priority: String, state: String) {
        viewModelScope.launch {
            try {
                taskRepository.createLongTask(title, description, emoji, priority, state)
                refreshProjectList()
            } catch (_: Exception) {}
        }
    }

    private fun refreshProjectList() {
        viewModelScope.launch {
            try {
                val projects = taskRepository.getLongTasks()
                    .sortedByPriority { it.priority }
                _uiState.value = _uiState.value.copy(projects = projects)
            } catch (_: Exception) {}
        }
        refreshWidget()
    }
}
