package com.casually.app.data.model

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class AuthResponse(
    val sessionToken: String,
    val user: AuthUser,
)

@JsonClass(generateAdapter = true)
data class AuthUser(
    val id: String,
    val name: String?,
    val email: String?,
    val image: String?,
)
