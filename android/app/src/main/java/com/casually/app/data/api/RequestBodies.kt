package com.casually.app.data.api

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class MobileAuthRequest(val idToken: String)

@JsonClass(generateAdapter = true)
data class CreateLongTaskRequest(
    val title: String,
    val description: String? = null,
    val emoji: String? = null,
    val priority: String = "MEDIUM",
    val state: String = "WAITING",
)

@JsonClass(generateAdapter = true)
data class UpdateTaskRequest(
    val title: String? = null,
    val description: String? = null,
    val emoji: String? = null,
    val priority: String? = null,
    val order: Int? = null,
)

@JsonClass(generateAdapter = true)
data class CreateShortTaskRequest(
    val parentId: String,
    val title: String,
    val description: String? = null,
    val emoji: String? = null,
    val priority: String = "MEDIUM",
)

@JsonClass(generateAdapter = true)
data class ChangeStateRequest(
    val state: String,
    val blockedById: String? = null,
)

@JsonClass(generateAdapter = true)
data class MoveTaskRequest(val newParentId: String)
