package com.casually.app.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.ShortRunningTask
import com.casually.app.domain.model.TaskState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardUiState(
    val isLoading: Boolean = true,
    val projects: List<LongRunningTask> = emptyList(),
    val childrenByProject: Map<String, List<ShortRunningTask>> = emptyMap(),
    val loadingChildren: Set<String> = emptySet(),
    val expandedProjects: Set<String> = emptySet(),
    val projectStateFilter: String = "ACTIVE",
    val taskStateFilter: String = "ACTIVE",
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
                val projects = taskRepository.getLongTasks()
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    projects = projects,
                )
                // Re-fetch children for expanded projects
                for (id in _uiState.value.expandedProjects) {
                    fetchChildren(id)
                }
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

    fun setTaskFilter(filter: String) {
        _uiState.value = _uiState.value.copy(taskStateFilter = filter)
    }

    fun toggleProject(projectId: String) {
        val expanded = _uiState.value.expandedProjects.toMutableSet()
        if (expanded.contains(projectId)) {
            expanded.remove(projectId)
        } else {
            expanded.add(projectId)
            if (!_uiState.value.childrenByProject.containsKey(projectId)) {
                fetchChildren(projectId)
            }
        }
        _uiState.value = _uiState.value.copy(expandedProjects = expanded)
    }

    private fun fetchChildren(projectId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                loadingChildren = _uiState.value.loadingChildren + projectId
            )
            try {
                val project = taskRepository.getLongTask(projectId)
                val children = project.children ?: emptyList()
                _uiState.value = _uiState.value.copy(
                    childrenByProject = _uiState.value.childrenByProject + (projectId to children),
                    loadingChildren = _uiState.value.loadingChildren - projectId,
                )
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(
                    loadingChildren = _uiState.value.loadingChildren - projectId,
                )
            }
        }
    }

    fun refreshProject(projectId: String) {
        fetchChildren(projectId)
    }

    // Task actions
    fun changeTaskState(taskId: String, projectId: String, state: String) {
        viewModelScope.launch {
            try {
                taskRepository.changeShortTaskState(taskId, state)
                fetchChildren(projectId)
                refreshProjectList()
            } catch (_: Exception) {}
        }
    }

    fun changeTaskPriority(taskId: String, projectId: String, priority: String) {
        viewModelScope.launch {
            try {
                taskRepository.updateShortTask(taskId, priority = priority)
                fetchChildren(projectId)
            } catch (_: Exception) {}
        }
    }

    fun editTask(taskId: String, projectId: String, title: String, description: String?, emoji: String?, priority: String) {
        viewModelScope.launch {
            try {
                taskRepository.updateShortTask(taskId, title = title, description = description, emoji = emoji, priority = priority)
                fetchChildren(projectId)
            } catch (_: Exception) {}
        }
    }

    fun deleteTask(taskId: String, projectId: String) {
        viewModelScope.launch {
            try {
                taskRepository.deleteShortTask(taskId)
                fetchChildren(projectId)
                refreshProjectList()
            } catch (_: Exception) {}
        }
    }

    fun moveTask(taskId: String, fromProjectId: String, toProjectId: String) {
        viewModelScope.launch {
            try {
                taskRepository.moveShortTask(taskId, toProjectId)
                fetchChildren(fromProjectId)
                if (_uiState.value.expandedProjects.contains(toProjectId)) {
                    fetchChildren(toProjectId)
                }
                refreshProjectList()
            } catch (_: Exception) {}
        }
    }

    fun createTask(parentId: String, title: String, description: String?, emoji: String?, priority: String) {
        viewModelScope.launch {
            try {
                taskRepository.createShortTask(parentId, title, description, emoji, priority)
                fetchChildren(parentId)
                refreshProjectList()
            } catch (_: Exception) {}
        }
    }

    // Project actions
    fun changeProjectState(projectId: String, state: String) {
        viewModelScope.launch {
            try {
                taskRepository.changeLongTaskState(projectId, state)
                refresh()
            } catch (_: Exception) {}
        }
    }

    fun changeProjectPriority(projectId: String, priority: String) {
        viewModelScope.launch {
            try {
                taskRepository.updateLongTask(projectId, priority = priority)
                refreshProjectList()
            } catch (_: Exception) {}
        }
    }

    fun editProject(projectId: String, title: String, description: String?, emoji: String?, priority: String) {
        viewModelScope.launch {
            try {
                taskRepository.updateLongTask(projectId, title = title, description = description, emoji = emoji, priority = priority)
                refreshProjectList()
            } catch (_: Exception) {}
        }
    }

    fun deleteProject(projectId: String) {
        viewModelScope.launch {
            try {
                taskRepository.deleteLongTask(projectId)
                val expanded = _uiState.value.expandedProjects.toMutableSet()
                expanded.remove(projectId)
                val children = _uiState.value.childrenByProject.toMutableMap()
                children.remove(projectId)
                _uiState.value = _uiState.value.copy(
                    expandedProjects = expanded,
                    childrenByProject = children,
                )
                refreshProjectList()
            } catch (_: Exception) {}
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
                _uiState.value = _uiState.value.copy(projects = projects)
            } catch (_: Exception) {}
        }
    }

    val filteredProjects: List<LongRunningTask>
        get() {
            val state = _uiState.value
            return if (state.projectStateFilter == "ALL") {
                state.projects
            } else {
                state.projects.filter { it.state.name == state.projectStateFilter }
            }
        }
}
