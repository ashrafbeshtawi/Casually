package com.casually.app.ui.login

import android.content.Context
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import androidx.hilt.navigation.compose.hiltViewModel
import com.casually.app.BuildConfig
import com.casually.app.ui.theme.CasuallyPurple
import com.casually.app.ui.theme.CasuallyPurpleDark
import com.casually.app.ui.theme.CasuallyPurpleLight
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    LaunchedEffect(uiState.isLoggedIn) {
        if (uiState.isLoggedIn) onLoginSuccess()
    }

    // Animated gradient
    val infiniteTransition = rememberInfiniteTransition(label = "bg")
    val offset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(6000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "gradient",
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        CasuallyPurple,
                        CasuallyPurpleDark,
                        Color(0xFF4338CA),
                        CasuallyPurpleLight,
                    ),
                    start = Offset(0f, offset * 1000f),
                    end = Offset(1000f, (1f - offset) * 1000f),
                )
            ),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            modifier = Modifier
                .padding(horizontal = 32.dp)
                .fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        ) {
            Column(
                modifier = Modifier.padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                // Logo
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(CasuallyPurple),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "C",
                        color = Color.White,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }

                Spacer(Modifier.height(20.dp))

                Text(
                    "Casually",
                    style = MaterialTheme.typography.headlineMedium,
                    color = Color(0xFF1C1B1F),
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "Task management, simplified",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF49454F),
                )

                Spacer(Modifier.height(32.dp))

                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        color = CasuallyPurple,
                        modifier = Modifier.size(40.dp),
                    )
                } else {
                    Button(
                        onClick = {
                            scope.launch {
                                signInWithGoogle(context, viewModel)
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = CasuallyPurple,
                            contentColor = Color.White,
                        ),
                    ) {
                        Icon(
                            Icons.Default.AccountCircle,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "Sign in with Google",
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }

                // Error
                AnimatedVisibility(
                    visible = uiState.error != null,
                    enter = fadeIn() + expandVertically(),
                    exit = fadeOut() + shrinkVertically(),
                ) {
                    uiState.error?.let { error ->
                        Text(
                            error,
                            color = Color(0xFFEF4444),
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 16.dp),
                        )
                    }
                }
            }
        }
    }
}

private suspend fun signInWithGoogle(context: Context, viewModel: LoginViewModel) {
    viewModel.onSignInLoading()

    val credentialManager = CredentialManager.create(context)

    val googleIdOption = GetGoogleIdOption.Builder()
        .setServerClientId(BuildConfig.GOOGLE_CLIENT_ID)
        .setFilterByAuthorizedAccounts(false)
        .build()

    val request = GetCredentialRequest.Builder()
        .addCredentialOption(googleIdOption)
        .build()

    try {
        val result = try {
            credentialManager.getCredential(context, request)
        } catch (e: NoCredentialException) {
            val signInOption = GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_CLIENT_ID)
                .build()
            val fallbackRequest = GetCredentialRequest.Builder()
                .addCredentialOption(signInOption)
                .build()
            credentialManager.getCredential(context, fallbackRequest)
        }

        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(result.credential.data)
        viewModel.onGoogleIdToken(googleIdTokenCredential.idToken)
    } catch (e: GetCredentialCancellationException) {
        viewModel.onSignInError("Sign-in cancelled")
    } catch (e: Exception) {
        android.util.Log.e("LoginScreen", "Sign-in failed", e)
        viewModel.onSignInError(e.localizedMessage ?: "Google Sign-In failed. Please try again.")
    }
}
