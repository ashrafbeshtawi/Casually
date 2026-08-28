package com.casually.app.data.repository

import android.content.Context
import com.casually.app.data.api.*
import com.casually.app.domain.model.ApiToken
import com.casually.app.domain.model.Challenge
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.ShortRunningTask
import com.casually.app.widget.WidgetRefreshWorker
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TaskRepository @Inject constructor(
    private val api: CasuallyApi,
    @ApplicationContext private val context: Context,
) {
    private fun refreshWidget() {
        WidgetRefreshWorker.refreshNow(context)
    }

    // Long-running tasks
    suspend fun getLongTasks(state: String? = null): List<LongRunningTask> =
        api.getLongTasks(state = state)

    suspend fun getLongTask(id: String): LongRunningTask =
        api.getLongTask(id)

    suspend fun createLongTask(
        title: String,
        description: String? = null,
        emoji: String? = null,
        priority: String = "MEDIUM",
        state: String = "WAITING",
    ): LongRunningTask = api.createLongTask(
        CreateLongTaskRequest(title, description, emoji, priority, state)
    ).also { refreshWidget() }

    suspend fun updateLongTask(
        id: String,
        title: String? = null,
        description: String? = null,
        emoji: String? = null,
        priority: String? = null,
        order: Int? = null,
        collapsed: Boolean? = null,
    ): LongRunningTask = api.updateLongTask(
        id, UpdateTaskRequest(title, description, emoji, priority, order, collapsed)
    ).also { refreshWidget() }

    suspend fun deleteLongTask(id: String) { api.deleteLongTask(id); refreshWidget() }

    suspend fun changeLongTaskState(id: String, state: String, blockedById: String? = null): LongRunningTask =
        api.changeLongTaskState(id, ChangeStateRequest(state, blockedById)).also { refreshWidget() }

    // Short-running tasks
    suspend fun getShortTasks(parentId: String? = null, state: String? = null): List<ShortRunningTask> =
        api.getShortTasks(parentId = parentId, state = state)

    suspend fun createShortTask(
        parentId: String,
        title: String,
        description: String? = null,
        emoji: String? = null,
        priority: String = "MEDIUM",
    ): ShortRunningTask = api.createShortTask(
        CreateShortTaskRequest(parentId, title, description, emoji, priority)
    ).also { refreshWidget() }

    suspend fun updateShortTask(
        id: String,
        title: String? = null,
        description: String? = null,
        emoji: String? = null,
        priority: String? = null,
        order: Int? = null,
    ): ShortRunningTask = api.updateShortTask(
        id, UpdateTaskRequest(title, description, emoji, priority, order)
    ).also { refreshWidget() }

    suspend fun deleteShortTask(id: String) { api.deleteShortTask(id); refreshWidget() }

    suspend fun changeShortTaskState(id: String, state: String, blockedById: String? = null): ShortRunningTask =
        api.changeShortTaskState(id, ChangeStateRequest(state, blockedById)).also { refreshWidget() }

    suspend fun moveShortTask(id: String, newParentId: String): ShortRunningTask =
        api.moveShortTask(id, MoveTaskRequest(newParentId)).also { refreshWidget() }

    // Challenges (don't affect widget, no refresh needed)
    suspend fun getChallenges(): List<Challenge> = api.getChallenges()

    suspend fun createChallenge(title: String, emoji: String? = null): Challenge =
        api.createChallenge(CreateChallengeRequest(title, emoji))

    suspend fun updateChallenge(id: String, title: String? = null, emoji: String? = null): Challenge =
        api.updateChallenge(id, UpdateChallengeRequest(title, emoji))

    suspend fun deleteChallenge(id: String) { api.deleteChallenge(id) }

    suspend fun relapseChallenge(id: String): Challenge = api.relapseChallenge(id)

    // MCP access tokens
    suspend fun getApiTokens(): List<ApiToken> = api.getApiTokens()

    suspend fun createApiToken(name: String?): ApiToken =
        api.createApiToken(CreateTokenRequest(name?.takeIf { it.isNotBlank() }))

    suspend fun deleteApiToken(id: String) { api.deleteApiToken(id) }
}
