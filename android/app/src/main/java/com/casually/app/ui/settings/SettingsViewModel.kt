package com.casually.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.ApiToken
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val isLoadingTokens: Boolean = true,
    val tokens: List<ApiToken> = emptyList(),
    val newToken: ApiToken? = null,
    val isCreating: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingTokens = true, error = null)
            try {
                val tokens = taskRepository.getApiTokens()
                _uiState.value = _uiState.value.copy(isLoadingTokens = false, tokens = tokens)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoadingTokens = false,
                    error = e.message ?: "Failed to load tokens",
                )
            }
        }
    }

    fun createToken(name: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isCreating = true, error = null)
            try {
                val created = taskRepository.createApiToken(name)
                _uiState.value = _uiState.value.copy(
                    isCreating = false,
                    newToken = created,
                    tokens = listOf(created.copy(token = null)) + _uiState.value.tokens,
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isCreating = false,
                    error = e.message ?: "Failed to create token",
                )
            }
        }
    }

    fun revokeToken(id: String) {
        _uiState.value = _uiState.value.copy(
            tokens = _uiState.value.tokens.filter { it.id != id },
        )
        viewModelScope.launch {
            try {
                taskRepository.deleteApiToken(id)
            } catch (_: Exception) {
                refresh()
            }
        }
    }

    fun dismissNewToken() {
        _uiState.value = _uiState.value.copy(newToken = null)
    }
}
