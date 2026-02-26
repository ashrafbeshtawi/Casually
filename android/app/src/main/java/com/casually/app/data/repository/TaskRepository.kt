package com.casually.app.data.repository

import com.casually.app.data.api.*
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.ShortRunningTask
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TaskRepository @Inject constructor(
    private val api: CasuallyApi,
) {
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
    )

    suspend fun updateLongTask(
        id: String,
        title: String? = null,
        description: String? = null,
        emoji: String? = null,
        priority: String? = null,
        order: Int? = null,
    ): LongRunningTask = api.updateLongTask(
        id, UpdateTaskRequest(title, description, emoji, priority, order)
    )

    suspend fun deleteLongTask(id: String) { api.deleteLongTask(id) }

    suspend fun changeLongTaskState(id: String, state: String, blockedById: String? = null): LongRunningTask =
        api.changeLongTaskState(id, ChangeStateRequest(state, blockedById))

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
    )

    suspend fun updateShortTask(
        id: String,
        title: String? = null,
        description: String? = null,
        emoji: String? = null,
        priority: String? = null,
        order: Int? = null,
    ): ShortRunningTask = api.updateShortTask(
        id, UpdateTaskRequest(title, description, emoji, priority, order)
    )

    suspend fun deleteShortTask(id: String) { api.deleteShortTask(id) }

    suspend fun changeShortTaskState(id: String, state: String, blockedById: String? = null): ShortRunningTask =
        api.changeShortTaskState(id, ChangeStateRequest(state, blockedById))

    suspend fun moveShortTask(id: String, newParentId: String): ShortRunningTask =
        api.moveShortTask(id, MoveTaskRequest(newParentId))
}
