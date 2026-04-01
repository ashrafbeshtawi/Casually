package com.casually.app.ui.challenges

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.Challenge
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChallengesUiState(
    val isLoading: Boolean = true,
    val challenges: List<Challenge> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class ChallengesViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChallengesUiState())
    val uiState = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val challenges = taskRepository.getChallenges()
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    challenges = challenges,
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load",
                )
            }
        }
    }

    fun createChallenge(title: String, emoji: String?) {
        viewModelScope.launch {
            try {
                val challenge = taskRepository.createChallenge(title, emoji)
                _uiState.value = _uiState.value.copy(
                    challenges = listOf(challenge) + _uiState.value.challenges,
                )
            } catch (_: Exception) {
                refresh()
            }
        }
    }

    fun relapse(id: String) {
        viewModelScope.launch {
            try {
                val updated = taskRepository.relapseChallenge(id)
                _uiState.value = _uiState.value.copy(
                    challenges = _uiState.value.challenges.map {
                        if (it.id == id) updated else it
                    },
                )
            } catch (_: Exception) {
                refresh()
            }
        }
    }

    fun editChallenge(id: String, title: String, emoji: String?) {
        // Optimistic
        _uiState.value = _uiState.value.copy(
            challenges = _uiState.value.challenges.map {
                if (it.id == id) it.copy(title = title, emoji = emoji) else it
            },
        )
        viewModelScope.launch {
            try {
                taskRepository.updateChallenge(id, title, emoji)
            } catch (_: Exception) {
                refresh()
            }
        }
    }

    fun delete(id: String) {
        _uiState.value = _uiState.value.copy(
            challenges = _uiState.value.challenges.filter { it.id != id },
        )
        viewModelScope.launch {
            try {
                taskRepository.deleteChallenge(id)
            } catch (_: Exception) {
                refresh()
            }
        }
    }
}
