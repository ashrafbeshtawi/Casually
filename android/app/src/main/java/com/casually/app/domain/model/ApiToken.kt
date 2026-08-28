package com.casually.app.domain.model

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ApiToken(
    val id: String,
    val name: String,
    val createdAt: String,
    // Plaintext token, only present in the create response — shown once.
    val token: String? = null,
)
