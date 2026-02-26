package com.casually.app.data.api

import com.casually.app.data.SessionManager
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class AuthInterceptor @Inject constructor(
    private val sessionManager: SessionManager
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val token = sessionManager.sessionToken
            ?: return chain.proceed(request)

        val authenticatedRequest = request.newBuilder()
            .addHeader("Cookie", "authjs.session-token=$token")
            .build()

        return chain.proceed(authenticatedRequest)
    }
}
