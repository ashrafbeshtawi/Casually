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

        // Send both cookie names: secure (HTTPS/Vercel) and plain (local dev)
        val authenticatedRequest = request.newBuilder()
            .addHeader("Cookie", "__Secure-authjs.session-token=$token; authjs.session-token=$token")
            .build()

        return chain.proceed(authenticatedRequest)
    }
}
