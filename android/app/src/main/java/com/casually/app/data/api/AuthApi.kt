package com.casually.app.data.api

import com.casually.app.data.model.AuthResponse
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApi {
    @POST("api/auth/mobile")
    suspend fun mobileAuth(@Body request: MobileAuthRequest): AuthResponse
}
