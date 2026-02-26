package com.casually.app.domain.model

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ShortRunningTask(
    val id: String,
    val title: String,
    val description: String?,
    val emoji: String?,
    val priority: Priority,
    val state: TaskState,
    val order: Int,
    val parentId: String,
    val parent: LongRunningTaskRef? = null,
    val blockedById: String?,
    val createdAt: String,
    val updatedAt: String,
)

@JsonClass(generateAdapter = true)
data class LongRunningTaskRef(
    val id: String,
    val title: String,
    val emoji: String?,
)
