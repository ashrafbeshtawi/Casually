package com.casually.app.ui.activedashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.Priority
import com.casually.app.domain.model.ShortRunningTask
import com.casually.app.domain.model.TaskState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ActiveDashboardUiState(
    val isLoading: Boolean = true,
    val activeProjects: List<LongRunningTask> = emptyList(),
    val childrenByProject: Map<String, List<ShortRunningTask>> = emptyMap(),
    val oneOffTasks: List<ShortRunningTask> = emptyList(),
    val routineTasks: List<ShortRunningTask> = emptyList(),
    val oneOffProjectId: String? = null,
    val routinesProjectId: String? = null,
    val allProjects: List<LongRunningTask> = emptyList(),
    val error: String? = null,
)

private val SPECIAL_TITLES = listOf("One-Off Tasks", "Routines")

@HiltViewModel
class ActiveDashboardViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ActiveDashboardUiState())
    val uiState = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val allProjects = taskRepository.getLongTasks()
                val allActiveProjects = allProjects.filter { it.state == TaskState.ACTIVE && it.title !in SPECIAL_TITLES }

                val oneOffProject = allProjects.find { it.title == "One-Off Tasks" }
                val routinesProject = allProjects.find { it.title == "Routines" }

                val activeTasks = taskRepository.getShortTasks(state = "ACTIVE")
                val tasksByParent = activeTasks.groupBy { it.parentId }

                // Only include projects that have at least one active subtask
                val activeProjects = allActiveProjects.filter { (tasksByParent[it.id] ?: emptyList()).isNotEmpty() }

                val childrenByProject = activeProjects.associate { project ->
                    project.id to (tasksByParent[project.id] ?: emptyList())
                }

                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    activeProjects = activeProjects,
                    childrenByProject = childrenByProject,
                    oneOffTasks = oneOffProject?.let { tasksByParent[it.id] } ?: emptyList(),
                    routineTasks = routinesProject?.let { tasksByParent[it.id] } ?: emptyList(),
                    oneOffProjectId = oneOffProject?.id,
                    routinesProjectId = routinesProject?.id,
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
                val allActiveProjects = allProjects.filter { it.state == TaskState.ACTIVE && it.title !in SPECIAL_TITLES }

                val oneOffProject = allProjects.find { it.title == "One-Off Tasks" }
                val routinesProject = allProjects.find { it.title == "Routines" }

                val activeTasks = taskRepository.getShortTasks(state = "ACTIVE")
                val tasksByParent = activeTasks.groupBy { it.parentId }

                val activeProjects = allActiveProjects.filter { (tasksByParent[it.id] ?: emptyList()).isNotEmpty() }

                val childrenByProject = activeProjects.associate { project ->
                    project.id to (tasksByParent[project.id] ?: emptyList())
                }

                _uiState.value = _uiState.value.copy(
                    activeProjects = activeProjects,
                    childrenByProject = childrenByProject,
                    oneOffTasks = oneOffProject?.let { tasksByParent[it.id] } ?: emptyList(),
                    routineTasks = routinesProject?.let { tasksByParent[it.id] } ?: emptyList(),
                    oneOffProjectId = oneOffProject?.id,
                    routinesProjectId = routinesProject?.id,
                    allProjects = allProjects,
                )
            } catch (_: Exception) {}
        }
    }

    fun changeTaskState(taskId: String, parentId: String, state: String) {
        val newState = TaskState.valueOf(state)
        _uiState.value = _uiState.value.copy(
            childrenByProject = _uiState.value.childrenByProject.mapValues { (pid, tasks) ->
                if (pid == parentId) tasks.map { if (it.id == taskId) it.copy(state = newState) else it }
                else tasks
            },
            oneOffTasks = _uiState.value.oneOffTasks.map { if (it.id == taskId) it.copy(state = newState) else it },
            routineTasks = _uiState.value.routineTasks.map { if (it.id == taskId) it.copy(state = newState) else it },
        )
        viewModelScope.launch {
            try {
                taskRepository.changeShortTaskState(taskId, state)
            } catch (_: Exception) { refresh() }
        }
    }

    fun changeTaskPriority(taskId: String, parentId: String, priority: String) {
        val newPriority = Priority.valueOf(priority)
        _uiState.value = _uiState.value.copy(
            childrenByProject = _uiState.value.childrenByProject.mapValues { (pid, tasks) ->
                if (pid == parentId) tasks.map { if (it.id == taskId) it.copy(priority = newPriority) else it }
                else tasks
            },
            oneOffTasks = _uiState.value.oneOffTasks.map { if (it.id == taskId) it.copy(priority = newPriority) else it },
            routineTasks = _uiState.value.routineTasks.map { if (it.id == taskId) it.copy(priority = newPriority) else it },
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
            oneOffTasks = _uiState.value.oneOffTasks.filter { it.id != taskId },
            routineTasks = _uiState.value.routineTasks.filter { it.id != taskId },
        )
        viewModelScope.launch {
            try {
                taskRepository.deleteShortTask(taskId)
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
