package com.casually.app.domain.model

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Challenge(
    val id: String,
    val title: String,
    val emoji: String? = null,
    val startedAt: String,
    val createdAt: String,
    val updatedAt: String,
)
