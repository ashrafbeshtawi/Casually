package com.casually.app.data.repository

import android.content.Context
import com.casually.app.data.SessionManager
import com.casually.app.data.api.AuthApi
import com.casually.app.data.api.MobileAuthRequest
import com.casually.app.widget.WidgetDataProvider
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val sessionManager: SessionManager,
    @ApplicationContext private val context: Context,
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

    // Outlives any screen, so the cleanup below finishes after navigation.
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /**
     * Clears the local session right away and returns, so the caller can
     * navigate at once. Wiping the widget and deleting the server session
     * with the remembered token run in the background; if the server call
     * fails, the session expires on its own.
     */
    fun signOut() {
        val token = sessionManager.sessionToken
        sessionManager.clear()
        appScope.launch {
            clearWidgets()
            if (token != null) deleteServerSession(token)
        }
    }

    private suspend fun clearWidgets() {
        val widgets = WidgetDataProvider(context)
        try {
            widgets.clearAll()
            widgets.refreshWidgets()
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // No widget placed, or Glance unavailable: nothing to wipe.
        }
    }

    private suspend fun deleteServerSession(token: String) {
        try {
            authApi.signOut("__Secure-authjs.session-token=$token; authjs.session-token=$token")
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // Offline: signed out on the device anyway.
        }
    }
}
