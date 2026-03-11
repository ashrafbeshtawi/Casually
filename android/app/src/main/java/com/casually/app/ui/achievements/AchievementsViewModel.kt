package com.casually.app.ui.achievements

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

data class ProjectWithDoneTasks(
    val projectId: String,
    val projectTitle: String,
    val projectEmoji: String?,
    val tasks: List<ShortRunningTask>,
)

data class AchievementsUiState(
    val isLoading: Boolean = true,
    val doneProjects: List<LongRunningTask> = emptyList(),
    val tasksByProject: List<ProjectWithDoneTasks> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class AchievementsViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AchievementsUiState())
    val uiState = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val doneProjects = taskRepository.getLongTasks(state = "DONE")
                val doneTasks = taskRepository.getShortTasks(state = "DONE")

                // Group tasks by parent project
                val grouped = doneTasks.groupBy { it.parentId }
                val tasksByProject = grouped.map { (parentId, tasks) ->
                    val parent = tasks.firstOrNull()?.parent
                    ProjectWithDoneTasks(
                        projectId = parentId,
                        projectTitle = parent?.title ?: "Unknown",
                        projectEmoji = parent?.emoji,
                        tasks = tasks,
                    )
                }

                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    doneProjects = doneProjects,
                    tasksByProject = tasksByProject,
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load",
                )
            }
        }
    }
}
