package com.casually.app.data.repository

import android.content.Context
import com.casually.app.data.SessionManager
import com.casually.app.data.api.AuthApi
import com.casually.app.data.api.MobileAuthRequest
import com.casually.app.widget.WidgetDataProvider
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CancellationException
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

    /**
     * Signs out on the device first (local session, widget), then deletes the
     * server session with the remembered token. Local sign-out never waits on
     * or depends on the network; if the server call fails, the session
     * expires on its own.
     */
    suspend fun signOut() {
        val token = sessionManager.sessionToken
        sessionManager.clear()
        val widgets = WidgetDataProvider(context)
        try {
            widgets.clearAll()
            widgets.refreshWidgets()
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // No widget placed, or Glance unavailable: nothing to wipe.
        }
        if (token != null) {
            try {
                authApi.signOut("__Secure-authjs.session-token=$token; authjs.session-token=$token")
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                // Offline: signed out on the device anyway.
            }
        }
    }
}
