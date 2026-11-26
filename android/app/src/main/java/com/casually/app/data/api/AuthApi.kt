package com.casually.app.data.api

import com.casually.app.data.model.AuthResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.Header
import retrofit2.http.POST

interface AuthApi {
    @POST("api/auth/mobile")
    suspend fun mobileAuth(@Body request: MobileAuthRequest): AuthResponse

    /**
     * Deletes the server session. The cookie is passed explicitly because the
     * local session is already cleared when this runs, so AuthInterceptor
     * adds nothing.
     */
    @DELETE("api/auth/mobile")
    suspend fun signOut(@Header("Cookie") cookie: String): Response<Unit>
}
