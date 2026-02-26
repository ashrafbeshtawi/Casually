package com.casually.app.data.api

import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.ShortRunningTask
import retrofit2.Response
import retrofit2.http.*

interface CasuallyApi {
    // Long-running tasks
    @GET("api/tasks/long")
    suspend fun getLongTasks(
        @Query("state") state: String? = null,
        @Query("priority") priority: String? = null,
    ): List<LongRunningTask>

    @POST("api/tasks/long")
    suspend fun createLongTask(@Body body: CreateLongTaskRequest): LongRunningTask

    @GET("api/tasks/long/{id}")
    suspend fun getLongTask(@Path("id") id: String): LongRunningTask

    @PATCH("api/tasks/long/{id}")
    suspend fun updateLongTask(
        @Path("id") id: String,
        @Body body: UpdateTaskRequest,
    ): LongRunningTask

    @DELETE("api/tasks/long/{id}")
    suspend fun deleteLongTask(@Path("id") id: String): Response<Unit>

    @PATCH("api/tasks/long/{id}/state")
    suspend fun changeLongTaskState(
        @Path("id") id: String,
        @Body body: ChangeStateRequest,
    ): LongRunningTask

    // Short-running tasks
    @GET("api/tasks/short")
    suspend fun getShortTasks(
        @Query("parentId") parentId: String? = null,
        @Query("state") state: String? = null,
        @Query("priority") priority: String? = null,
    ): List<ShortRunningTask>

    @POST("api/tasks/short")
    suspend fun createShortTask(@Body body: CreateShortTaskRequest): ShortRunningTask

    @GET("api/tasks/short/{id}")
    suspend fun getShortTask(@Path("id") id: String): ShortRunningTask

    @PATCH("api/tasks/short/{id}")
    suspend fun updateShortTask(
        @Path("id") id: String,
        @Body body: UpdateTaskRequest,
    ): ShortRunningTask

    @DELETE("api/tasks/short/{id}")
    suspend fun deleteShortTask(@Path("id") id: String): Response<Unit>

    @PATCH("api/tasks/short/{id}/state")
    suspend fun changeShortTaskState(
        @Path("id") id: String,
        @Body body: ChangeStateRequest,
    ): ShortRunningTask

    @PATCH("api/tasks/short/{id}/move")
    suspend fun moveShortTask(
        @Path("id") id: String,
        @Body body: MoveTaskRequest,
    ): ShortRunningTask
}
