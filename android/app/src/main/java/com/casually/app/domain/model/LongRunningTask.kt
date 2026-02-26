package com.casually.app.domain.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ChildCount(
    val children: Int
)

@JsonClass(generateAdapter = true)
data class LongRunningTask(
    val id: String,
    val title: String,
    val description: String?,
    val emoji: String?,
    val priority: Priority,
    val state: TaskState,
    val order: Int,
    val blockedById: String?,
    val userId: String,
    val children: List<ShortRunningTask>? = null,
    @Json(name = "_count") val count: ChildCount? = null,
    val createdAt: String,
    val updatedAt: String,
)
