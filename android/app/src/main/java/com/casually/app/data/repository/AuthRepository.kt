package com.casually.app.data.repository

import com.casually.app.data.SessionManager
import com.casually.app.data.api.AuthApi
import com.casually.app.data.api.MobileAuthRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val sessionManager: SessionManager,
) {
    val isLoggedIn: Boolean get() = sessionManager.isLoggedIn
    val userName: String? get() = sessionManager.userName
    val userEmail: String? get() = sessionManager.userEmail
    val userImage: String? get() = sessionManager.userImage

    suspend fun signIn(googleIdToken: String) {
        val response = authApi.mobileAuth(MobileAuthRequest(googleIdToken))
        sessionManager.sessionToken = response.sessionToken
        sessionManager.userName = response.user.name
        sessionManager.userEmail = response.user.email
        sessionManager.userImage = response.user.image
    }

    fun signOut() {
        sessionManager.clear()
    }
}
