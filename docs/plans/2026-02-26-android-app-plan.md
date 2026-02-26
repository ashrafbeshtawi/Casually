# Casually Android App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a native Android app with home screen widget for the Casually task manager, consuming the existing Next.js REST API.

**Architecture:** Single-module MVVM with Jetpack Compose UI, Retrofit for networking, Hilt for DI, and Glance for the home screen widget. Online-only — no local database. Auth via native Google Sign-In with backend session token exchange.

**Tech Stack:** Kotlin, Jetpack Compose BOM, Navigation Compose, Retrofit 2 + OkHttp + Moshi, Google Identity Services, Hilt, Glance, WorkManager, EncryptedSharedPreferences

---

### Task 1: Backend — Mobile Auth Endpoint

Add `POST /api/auth/mobile` to the Next.js backend so the Android app can exchange a Google ID token for a session token.

**Files:**
- Create: `src/app/api/auth/mobile/route.ts`

**Step 1: Install google-auth-library**

Run: `npm install google-auth-library`

**Step 2: Create the mobile auth endpoint**

```typescript
// src/app/api/auth/mobile/route.ts
import { NextRequest, NextResponse } from "next/server"
import { OAuth2Client } from "google-auth-library"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export async function POST(request: NextRequest) {
  let body: { idToken?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { idToken } = body
  if (!idToken) {
    return NextResponse.json({ error: "idToken is required" }, { status: 400 })
  }

  // Verify the Google ID token
  let payload
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    payload = ticket.getPayload()
  } catch {
    return NextResponse.json({ error: "Invalid ID token" }, { status: 401 })
  }

  if (!payload?.email) {
    return NextResponse.json({ error: "No email in token" }, { status: 401 })
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: payload.email } })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name ?? null,
        image: payload.picture ?? null,
        emailVerified: payload.email_verified ? new Date() : null,
      },
    })

    // Create default tasks (same as auth.ts createUser event)
    await prisma.longRunningTask.createMany({
      data: [
        {
          title: "One-Off Tasks",
          emoji: "\u{1F4CC}",
          state: "ACTIVE",
          priority: "MEDIUM",
          userId: user.id,
          order: 0,
        },
        {
          title: "Routines",
          emoji: "\u{1F504}",
          state: "ACTIVE",
          priority: "MEDIUM",
          userId: user.id,
          order: 1,
        },
      ],
    })
  }

  // Create a database session (30-day expiry)
  const sessionToken = randomUUID()
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  })

  return NextResponse.json({
    sessionToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    },
  })
}
```

**Step 3: Update middleware to allow `/api/auth/mobile`**

The existing middleware matcher already excludes `api/auth` paths:
```
"/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"
```

So `/api/auth/mobile` is already excluded. No change needed.

**Step 4: Test manually**

Run: `npm run dev`

Test with curl (use a real Google ID token from Google OAuth Playground or the Android app):
```bash
curl -X POST http://localhost:3000/api/auth/mobile \
  -H "Content-Type: application/json" \
  -d '{"idToken": "test"}'
```
Expected: 401 "Invalid ID token" (since "test" is not a real token — confirms endpoint works)

**Step 5: Commit**

```bash
git add src/app/api/auth/mobile/route.ts package.json package-lock.json
git commit -m "feat: add mobile auth endpoint for Android app"
```

---

### Task 2: Android Project Scaffold

Create the Android project with Gradle build files, manifest, and all dependencies.

**Files:**
- Create: `android/settings.gradle.kts`
- Create: `android/build.gradle.kts`
- Create: `android/gradle.properties`
- Create: `android/app/build.gradle.kts`
- Create: `android/app/src/main/AndroidManifest.xml`
- Create: `android/app/src/main/java/com/casually/app/CasuallyApp.kt`
- Create: `android/app/src/main/java/com/casually/app/MainActivity.kt`
- Create: `android/app/src/main/res/values/strings.xml`
- Create: `android/app/src/main/res/values/themes.xml`

**Step 1: Create root Gradle files**

```kotlin
// android/settings.gradle.kts
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolution {
    @Suppress("UnstableApiUsage")
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Casually"
include(":app")
```

```kotlin
// android/build.gradle.kts
plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.1.0" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.1.0" apply false
    id("com.google.dagger.hilt.android") version "2.53.1" apply false
    id("com.google.devtools.ksp") version "2.1.0-1.0.29" apply false
}
```

```properties
# android/gradle.properties
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
```

**Step 2: Create app build.gradle.kts with all dependencies**

```kotlin
// android/app/build.gradle.kts
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.dagger.hilt.android")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.casually.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.casually.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        // Set your backend URL here
        buildConfigField("String", "API_BASE_URL", "\"https://your-casually-app.vercel.app\"")
        buildConfigField("String", "GOOGLE_CLIENT_ID", "\"${project.findProperty("GOOGLE_CLIENT_ID") ?: ""}\"")
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)

    // Compose
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

    // Navigation
    implementation("androidx.navigation:navigation-compose:2.8.5")

    // Hilt
    implementation("com.google.dagger:hilt-android:2.53.1")
    ksp("com.google.dagger:hilt-android-compiler:2.53.1")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
    implementation("com.squareup.moshi:moshi-kotlin:1.15.1")
    ksp("com.squareup.moshi:moshi-kotlin-codegen:1.15.1")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Google Sign-In
    implementation("com.google.android.gms:play-services-auth:21.3.0")
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")

    // Encrypted SharedPreferences
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // Glance (widget)
    implementation("androidx.glance:glance-appwidget:1.1.1")
    implementation("androidx.glance:glance-material3:1.1.1")

    // WorkManager
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("androidx.hilt:hilt-work:1.2.0")
    ksp("androidx.hilt:hilt-compiler:1.2.0")

    // Coil for images
    implementation("io.coil-kt:coil-compose:2.7.0")

    // Pull-to-refresh
    implementation("androidx.compose.material3:material3-adaptive:1.0.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
```

**Step 3: Create AndroidManifest.xml**

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:name=".CasuallyApp"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.Casually">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.Casually">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

**Step 4: Create Application class and MainActivity**

```kotlin
// android/app/src/main/java/com/casually/app/CasuallyApp.kt
package com.casually.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class CasuallyApp : Application()
```

```kotlin
// android/app/src/main/java/com/casually/app/MainActivity.kt
package com.casually.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.casually.app.ui.theme.CasuallyTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CasuallyTheme {
                // Navigation will be added in Task 5
                androidx.compose.material3.Text("Casually")
            }
        }
    }
}
```

**Step 5: Create resource files**

```xml
<!-- android/app/src/main/res/values/strings.xml -->
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Casually</string>
</resources>
```

```xml
<!-- android/app/src/main/res/values/themes.xml -->
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.Casually" parent="android:Theme.Material.Light.NoActionBar" />
</resources>
```

**Step 6: Add Gradle wrapper**

Run from the `android/` directory:
```bash
cd android
gradle wrapper --gradle-version 8.11.1
cd ..
```

If `gradle` is not installed, download the wrapper files manually or use:
```bash
cd android
mkdir -p gradle/wrapper
# Download gradle-wrapper.jar and gradle-wrapper.properties
cd ..
```

**Step 7: Verify build**

```bash
cd android && ./gradlew assembleDebug && cd ..
```
Expected: BUILD SUCCESSFUL

**Step 8: Commit**

```bash
git add android/
git commit -m "feat: scaffold Android project with Compose, Hilt, Retrofit deps"
```

---

### Task 3: Domain Models & API DTOs

Create Kotlin data classes matching the backend's TypeScript types.

**Files:**
- Create: `android/app/src/main/java/com/casually/app/domain/model/Priority.kt`
- Create: `android/app/src/main/java/com/casually/app/domain/model/TaskState.kt`
- Create: `android/app/src/main/java/com/casually/app/domain/model/LongRunningTask.kt`
- Create: `android/app/src/main/java/com/casually/app/domain/model/ShortRunningTask.kt`
- Create: `android/app/src/main/java/com/casually/app/data/model/AuthResponse.kt`

**Step 1: Create enums**

```kotlin
// android/app/src/main/java/com/casually/app/domain/model/Priority.kt
package com.casually.app.domain.model

import androidx.compose.ui.graphics.Color

enum class Priority(val label: String, val color: Color) {
    HIGHEST("Highest", Color(0xFFEF4444)),
    HIGH("High", Color(0xFFF97316)),
    MEDIUM("Medium", Color(0xFFEAB308)),
    LOW("Low", Color(0xFF3B82F6)),
    LOWEST("Lowest", Color(0xFF22C55E));
}
```

```kotlin
// android/app/src/main/java/com/casually/app/domain/model/TaskState.kt
package com.casually.app.domain.model

enum class TaskState(val label: String) {
    ACTIVE("Active"),
    WAITING("Waiting"),
    BLOCKED("Blocked"),
    DONE("Done");

    companion object {
        fun validTransitions(from: TaskState): List<TaskState> = when (from) {
            ACTIVE -> listOf(WAITING, BLOCKED, DONE)
            WAITING -> listOf(ACTIVE, BLOCKED, DONE)
            BLOCKED -> listOf(ACTIVE, WAITING, DONE)
            DONE -> listOf(ACTIVE, WAITING)
        }
    }
}
```

**Step 2: Create task models**

```kotlin
// android/app/src/main/java/com/casually/app/domain/model/LongRunningTask.kt
package com.casually.app.domain.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ChildCount(
    val children: Int
)

@JsonClass(generateAdapter = true)
data class LongRunningTask(
    val id: String,
    val title: String,
    val description: String?,
    val emoji: String?,
    val priority: Priority,
    val state: TaskState,
    val order: Int,
    val blockedById: String?,
    val userId: String,
    val children: List<ShortRunningTask>? = null,
    @Json(name = "_count") val count: ChildCount? = null,
    val createdAt: String,
    val updatedAt: String,
)
```

```kotlin
// android/app/src/main/java/com/casually/app/domain/model/ShortRunningTask.kt
package com.casually.app.domain.model

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ShortRunningTask(
    val id: String,
    val title: String,
    val description: String?,
    val emoji: String?,
    val priority: Priority,
    val state: TaskState,
    val order: Int,
    val parentId: String,
    val parent: LongRunningTaskRef? = null,
    val blockedById: String?,
    val createdAt: String,
    val updatedAt: String,
)

@JsonClass(generateAdapter = true)
data class LongRunningTaskRef(
    val id: String,
    val title: String,
    val emoji: String?,
)
```

**Step 3: Create auth response DTO**

```kotlin
// android/app/src/main/java/com/casually/app/data/model/AuthResponse.kt
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
```

**Step 4: Commit**

```bash
git add android/app/src/main/java/com/casually/app/domain/ android/app/src/main/java/com/casually/app/data/model/
git commit -m "feat: add domain models and API DTOs for Android app"
```

---

### Task 4: Networking Layer (Retrofit + Auth Interceptor)

Set up Retrofit API interfaces, OkHttp auth interceptor, and Hilt DI module.

**Files:**
- Create: `android/app/src/main/java/com/casually/app/data/api/AuthApi.kt`
- Create: `android/app/src/main/java/com/casually/app/data/api/CasuallyApi.kt`
- Create: `android/app/src/main/java/com/casually/app/data/api/AuthInterceptor.kt`
- Create: `android/app/src/main/java/com/casually/app/data/api/RequestBodies.kt`
- Create: `android/app/src/main/java/com/casually/app/di/NetworkModule.kt`
- Create: `android/app/src/main/java/com/casually/app/data/SessionManager.kt`

**Step 1: Create SessionManager for token storage**

```kotlin
// android/app/src/main/java/com/casually/app/data/SessionManager.kt
package com.casually.app.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext context: Context
) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "casually_session",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    var sessionToken: String?
        get() = prefs.getString("session_token", null)
        set(value) = prefs.edit().putString("session_token", value).apply()

    var userName: String?
        get() = prefs.getString("user_name", null)
        set(value) = prefs.edit().putString("user_name", value).apply()

    var userEmail: String?
        get() = prefs.getString("user_email", null)
        set(value) = prefs.edit().putString("user_email", value).apply()

    var userImage: String?
        get() = prefs.getString("user_image", null)
        set(value) = prefs.edit().putString("user_image", value).apply()

    val isLoggedIn: Boolean get() = sessionToken != null

    fun clear() {
        prefs.edit().clear().apply()
    }
}
```

**Step 2: Create AuthInterceptor**

```kotlin
// android/app/src/main/java/com/casually/app/data/api/AuthInterceptor.kt
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
```

**Step 3: Create request body classes**

```kotlin
// android/app/src/main/java/com/casually/app/data/api/RequestBodies.kt
package com.casually.app.data.api

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class MobileAuthRequest(val idToken: String)

@JsonClass(generateAdapter = true)
data class CreateLongTaskRequest(
    val title: String,
    val description: String? = null,
    val emoji: String? = null,
    val priority: String = "MEDIUM",
    val state: String = "WAITING",
)

@JsonClass(generateAdapter = true)
data class UpdateTaskRequest(
    val title: String? = null,
    val description: String? = null,
    val emoji: String? = null,
    val priority: String? = null,
    val order: Int? = null,
)

@JsonClass(generateAdapter = true)
data class CreateShortTaskRequest(
    val parentId: String,
    val title: String,
    val description: String? = null,
    val emoji: String? = null,
    val priority: String = "MEDIUM",
)

@JsonClass(generateAdapter = true)
data class ChangeStateRequest(
    val state: String,
    val blockedById: String? = null,
)

@JsonClass(generateAdapter = true)
data class MoveTaskRequest(val newParentId: String)
```

**Step 4: Create API interfaces**

```kotlin
// android/app/src/main/java/com/casually/app/data/api/AuthApi.kt
package com.casually.app.data.api

import com.casually.app.data.model.AuthResponse
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApi {
    @POST("api/auth/mobile")
    suspend fun mobileAuth(@Body request: MobileAuthRequest): AuthResponse
}
```

```kotlin
// android/app/src/main/java/com/casually/app/data/api/CasuallyApi.kt
package com.casually.app.data.api

import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.ShortRunningTask
import retrofit2.Response
import retrofit2.http.*

interface CasuallyApi {
    // Long-running tasks
    @GET("api/tasks/long")
    suspend fun getLongTasks(
        @Query("state") state: String? = null,
        @Query("priority") priority: String? = null,
    ): List<LongRunningTask>

    @POST("api/tasks/long")
    suspend fun createLongTask(@Body body: CreateLongTaskRequest): LongRunningTask

    @GET("api/tasks/long/{id}")
    suspend fun getLongTask(@Path("id") id: String): LongRunningTask

    @PATCH("api/tasks/long/{id}")
    suspend fun updateLongTask(
        @Path("id") id: String,
        @Body body: UpdateTaskRequest,
    ): LongRunningTask

    @DELETE("api/tasks/long/{id}")
    suspend fun deleteLongTask(@Path("id") id: String): Response<Unit>

    @PATCH("api/tasks/long/{id}/state")
    suspend fun changeLongTaskState(
        @Path("id") id: String,
        @Body body: ChangeStateRequest,
    ): LongRunningTask

    // Short-running tasks
    @GET("api/tasks/short")
    suspend fun getShortTasks(
        @Query("parentId") parentId: String? = null,
        @Query("state") state: String? = null,
        @Query("priority") priority: String? = null,
    ): List<ShortRunningTask>

    @POST("api/tasks/short")
    suspend fun createShortTask(@Body body: CreateShortTaskRequest): ShortRunningTask

    @GET("api/tasks/short/{id}")
    suspend fun getShortTask(@Path("id") id: String): ShortRunningTask

    @PATCH("api/tasks/short/{id}")
    suspend fun updateShortTask(
        @Path("id") id: String,
        @Body body: UpdateTaskRequest,
    ): ShortRunningTask

    @DELETE("api/tasks/short/{id}")
    suspend fun deleteShortTask(@Path("id") id: String): Response<Unit>

    @PATCH("api/tasks/short/{id}/state")
    suspend fun changeShortTaskState(
        @Path("id") id: String,
        @Body body: ChangeStateRequest,
    ): ShortRunningTask

    @PATCH("api/tasks/short/{id}/move")
    suspend fun moveShortTask(
        @Path("id") id: String,
        @Body body: MoveTaskRequest,
    ): ShortRunningTask
}
```

**Step 5: Create Hilt DI module**

```kotlin
// android/app/src/main/java/com/casually/app/di/NetworkModule.kt
package com.casually.app.di

import com.casually.app.BuildConfig
import com.casually.app.data.api.AuthApi
import com.casually.app.data.api.AuthInterceptor
import com.casually.app.data.api.CasuallyApi
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideMoshi(): Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    @Provides
    @Singleton
    fun provideOkHttpClient(authInterceptor: AuthInterceptor): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)

        if (BuildConfig.DEBUG) {
            builder.addInterceptor(
                HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BODY
                }
            )
        }

        return builder.build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, moshi: Moshi): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL + "/")
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()

    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): AuthApi =
        retrofit.create(AuthApi::class.java)

    @Provides
    @Singleton
    fun provideCasuallyApi(retrofit: Retrofit): CasuallyApi =
        retrofit.create(CasuallyApi::class.java)
}
```

**Step 6: Verify build**

```bash
cd android && ./gradlew assembleDebug && cd ..
```
Expected: BUILD SUCCESSFUL

**Step 7: Commit**

```bash
git add android/
git commit -m "feat: add networking layer with Retrofit, auth interceptor, Hilt DI"
```

---

### Task 5: Repositories

Create repository classes that wrap the API calls.

**Files:**
- Create: `android/app/src/main/java/com/casually/app/data/repository/AuthRepository.kt`
- Create: `android/app/src/main/java/com/casually/app/data/repository/TaskRepository.kt`

**Step 1: Create AuthRepository**

```kotlin
// android/app/src/main/java/com/casually/app/data/repository/AuthRepository.kt
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
```

**Step 2: Create TaskRepository**

```kotlin
// android/app/src/main/java/com/casually/app/data/repository/TaskRepository.kt
package com.casually.app.data.repository

import com.casually.app.data.api.*
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.ShortRunningTask
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TaskRepository @Inject constructor(
    private val api: CasuallyApi,
) {
    // Long-running tasks
    suspend fun getLongTasks(state: String? = null): List<LongRunningTask> =
        api.getLongTasks(state = state)

    suspend fun getLongTask(id: String): LongRunningTask =
        api.getLongTask(id)

    suspend fun createLongTask(
        title: String,
        description: String? = null,
        emoji: String? = null,
        priority: String = "MEDIUM",
        state: String = "WAITING",
    ): LongRunningTask = api.createLongTask(
        CreateLongTaskRequest(title, description, emoji, priority, state)
    )

    suspend fun updateLongTask(
        id: String,
        title: String? = null,
        description: String? = null,
        emoji: String? = null,
        priority: String? = null,
        order: Int? = null,
    ): LongRunningTask = api.updateLongTask(
        id, UpdateTaskRequest(title, description, emoji, priority, order)
    )

    suspend fun deleteLongTask(id: String) { api.deleteLongTask(id) }

    suspend fun changeLongTaskState(id: String, state: String, blockedById: String? = null): LongRunningTask =
        api.changeLongTaskState(id, ChangeStateRequest(state, blockedById))

    // Short-running tasks
    suspend fun getShortTasks(parentId: String? = null, state: String? = null): List<ShortRunningTask> =
        api.getShortTasks(parentId = parentId, state = state)

    suspend fun createShortTask(
        parentId: String,
        title: String,
        description: String? = null,
        emoji: String? = null,
        priority: String = "MEDIUM",
    ): ShortRunningTask = api.createShortTask(
        CreateShortTaskRequest(parentId, title, description, emoji, priority)
    )

    suspend fun updateShortTask(
        id: String,
        title: String? = null,
        description: String? = null,
        emoji: String? = null,
        priority: String? = null,
        order: Int? = null,
    ): ShortRunningTask = api.updateShortTask(
        id, UpdateTaskRequest(title, description, emoji, priority, order)
    )

    suspend fun deleteShortTask(id: String) { api.deleteShortTask(id) }

    suspend fun changeShortTaskState(id: String, state: String, blockedById: String? = null): ShortRunningTask =
        api.changeShortTaskState(id, ChangeStateRequest(state, blockedById))

    suspend fun moveShortTask(id: String, newParentId: String): ShortRunningTask =
        api.moveShortTask(id, MoveTaskRequest(newParentId))
}
```

**Step 3: Commit**

```bash
git add android/app/src/main/java/com/casually/app/data/repository/
git commit -m "feat: add auth and task repositories"
```

---

### Task 6: Theme & Shared Components

Create the Compose theme and reusable UI components.

**Files:**
- Create: `android/app/src/main/java/com/casually/app/ui/theme/Theme.kt`
- Create: `android/app/src/main/java/com/casually/app/ui/components/PriorityDot.kt`
- Create: `android/app/src/main/java/com/casually/app/ui/components/StateBadge.kt`
- Create: `android/app/src/main/java/com/casually/app/ui/components/TaskCard.kt`
- Create: `android/app/src/main/java/com/casually/app/ui/components/ProjectCard.kt`
- Create: `android/app/src/main/java/com/casually/app/ui/components/LoadingScreen.kt`
- Create: `android/app/src/main/java/com/casually/app/ui/components/ErrorScreen.kt`

**Step 1: Create theme**

```kotlin
// android/app/src/main/java/com/casually/app/ui/theme/Theme.kt
package com.casually.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

@Composable
fun CasuallyTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context)
            else dynamicLightColorScheme(context)
        }
        darkTheme -> darkColorScheme()
        else -> lightColorScheme()
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content,
    )
}
```

**Step 2: Create PriorityDot and StateBadge**

```kotlin
// android/app/src/main/java/com/casually/app/ui/components/PriorityDot.kt
package com.casually.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.Priority

@Composable
fun PriorityDot(priority: Priority, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(8.dp)
            .clip(CircleShape)
            .background(priority.color)
    )
}
```

```kotlin
// android/app/src/main/java/com/casually/app/ui/components/StateBadge.kt
package com.casually.app.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.TaskState

@Composable
fun StateBadge(state: TaskState, modifier: Modifier = Modifier) {
    val colors = when (state) {
        TaskState.ACTIVE -> AssistChipDefaults.assistChipColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
            labelColor = MaterialTheme.colorScheme.onPrimaryContainer,
        )
        TaskState.WAITING -> AssistChipDefaults.assistChipColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer,
            labelColor = MaterialTheme.colorScheme.onSecondaryContainer,
        )
        TaskState.BLOCKED -> AssistChipDefaults.assistChipColors(
            containerColor = MaterialTheme.colorScheme.errorContainer,
            labelColor = MaterialTheme.colorScheme.onErrorContainer,
        )
        TaskState.DONE -> AssistChipDefaults.assistChipColors(
            containerColor = MaterialTheme.colorScheme.tertiaryContainer,
            labelColor = MaterialTheme.colorScheme.onTertiaryContainer,
        )
    }

    AssistChip(
        onClick = {},
        label = { Text(state.label) },
        modifier = modifier,
        colors = colors,
    )
}
```

**Step 3: Create TaskCard (for short-running tasks)**

```kotlin
// android/app/src/main/java/com/casually/app/ui/components/TaskCard.kt
package com.casually.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.ShortRunningTask

@Composable
fun TaskCard(
    task: ShortRunningTask,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (task.emoji != null) {
                Text(task.emoji, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.width(8.dp))
            }
            Text(
                task.title,
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(8.dp))
            PriorityDot(task.priority)
            Spacer(Modifier.width(8.dp))
            StateBadge(task.state)
        }
    }
}
```

**Step 4: Create ProjectCard (for long-running tasks)**

```kotlin
// android/app/src/main/java/com/casually/app/ui/components/ProjectCard.kt
package com.casually.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.LongRunningTask

@Composable
fun ProjectCard(
    task: LongRunningTask,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        border = BorderStroke(2.dp, task.priority.color),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (task.emoji != null) {
                    Text(task.emoji, style = MaterialTheme.typography.headlineSmall)
                    Spacer(Modifier.width(8.dp))
                }
                Text(
                    task.title,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f),
                )
            }
            if (task.description != null) {
                Spacer(Modifier.height(4.dp))
                Text(
                    task.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                )
            }
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                StateBadge(task.state)
                Spacer(Modifier.weight(1f))
                val childCount = task.count?.children ?: task.children?.size ?: 0
                if (childCount > 0) {
                    Text(
                        "$childCount tasks",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
```

**Step 5: Create LoadingScreen and ErrorScreen**

```kotlin
// android/app/src/main/java/com/casually/app/ui/components/LoadingScreen.kt
package com.casually.app.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier

@Composable
fun LoadingScreen(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}
```

```kotlin
// android/app/src/main/java/com/casually/app/ui/components/ErrorScreen.kt
package com.casually.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun ErrorScreen(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(message, style = MaterialTheme.typography.bodyLarge)
            Spacer(Modifier.height(16.dp))
            Button(onClick = onRetry) { Text("Retry") }
        }
    }
}
```

**Step 6: Commit**

```bash
git add android/app/src/main/java/com/casually/app/ui/
git commit -m "feat: add Compose theme and shared UI components"
```

---

### Task 7: Login Screen

Implement Google Sign-In with Credential Manager and the login screen.

**Files:**
- Create: `android/app/src/main/java/com/casually/app/ui/login/LoginViewModel.kt`
- Create: `android/app/src/main/java/com/casually/app/ui/login/LoginScreen.kt`

**Step 1: Create LoginViewModel**

```kotlin
// android/app/src/main/java/com/casually/app/ui/login/LoginViewModel.kt
package com.casually.app.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val isLoggedIn: Boolean = false,
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState(isLoggedIn = authRepository.isLoggedIn))
    val uiState = _uiState.asStateFlow()

    fun onGoogleIdToken(idToken: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                authRepository.signIn(idToken)
                _uiState.value = _uiState.value.copy(isLoading = false, isLoggedIn = true)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Sign in failed",
                )
            }
        }
    }
}
```

**Step 2: Create LoginScreen**

```kotlin
// android/app/src/main/java/com/casually/app/ui/login/LoginScreen.kt
package com.casually.app.ui.login

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.casually.app.BuildConfig
import com.google.android.gms.auth.api.identity.BeginSignInRequest
import com.google.android.gms.auth.api.identity.Identity

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(uiState.isLoggedIn) {
        if (uiState.isLoggedIn) onLoginSuccess()
    }

    val oneTapClient = remember { Identity.getSignInClient(context) }
    val signInRequest = remember {
        BeginSignInRequest.builder()
            .setGoogleIdTokenRequestOptions(
                BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
                    .setSupported(true)
                    .setServerClientId(BuildConfig.GOOGLE_CLIENT_ID)
                    .setFilterByAuthorizedAccounts(false)
                    .build()
            )
            .build()
    }

    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartIntentSenderForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val credential = oneTapClient.getSignInCredentialFromIntent(result.data)
            val idToken = credential.googleIdToken
            if (idToken != null) {
                viewModel.onGoogleIdToken(idToken)
            }
        }
    }

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Casually", style = MaterialTheme.typography.displayMedium)
            Spacer(Modifier.height(8.dp))
            Text(
                "Task management, simplified",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(48.dp))

            if (uiState.isLoading) {
                CircularProgressIndicator()
            } else {
                Button(onClick = {
                    oneTapClient.beginSignIn(signInRequest)
                        .addOnSuccessListener { result ->
                            launcher.launch(
                                IntentSenderRequest.Builder(result.pendingIntent.intentSender).build()
                            )
                        }
                        .addOnFailureListener { /* Could show error */ }
                }) {
                    Text("Sign in with Google")
                }
            }

            if (uiState.error != null) {
                Spacer(Modifier.height(16.dp))
                Text(
                    uiState.error!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}
```

**Step 3: Commit**

```bash
git add android/app/src/main/java/com/casually/app/ui/login/
git commit -m "feat: add Google Sign-In login screen"
```

---

### Task 8: Dashboard Screen

Shows active short-running tasks grouped by parent project.

**Files:**
- Create: `android/app/src/main/java/com/casually/app/ui/dashboard/DashboardViewModel.kt`
- Create: `android/app/src/main/java/com/casually/app/ui/dashboard/DashboardScreen.kt`

**Step 1: Create DashboardViewModel**

```kotlin
// android/app/src/main/java/com/casually/app/ui/dashboard/DashboardViewModel.kt
package com.casually.app.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.LongRunningTask
import com.casually.app.domain.model.ShortRunningTask
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardGroup(
    val project: LongRunningTask,
    val tasks: List<ShortRunningTask>,
)

data class DashboardUiState(
    val isLoading: Boolean = true,
    val groups: List<DashboardGroup> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val projects = taskRepository.getLongTasks(state = "ACTIVE")
                val tasks = taskRepository.getShortTasks(state = "ACTIVE")
                val tasksByParent = tasks.groupBy { it.parentId }

                val groups = projects
                    .filter { tasksByParent.containsKey(it.id) }
                    .map { project ->
                        DashboardGroup(project, tasksByParent[project.id] ?: emptyList())
                    }

                _uiState.value = DashboardUiState(isLoading = false, groups = groups)
            } catch (e: Exception) {
                _uiState.value = DashboardUiState(
                    isLoading = false,
                    error = e.message ?: "Failed to load",
                )
            }
        }
    }
}
```

**Step 2: Create DashboardScreen**

```kotlin
// android/app/src/main/java/com/casually/app/ui/dashboard/DashboardScreen.kt
package com.casually.app.ui.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.casually.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onProjectClick: (String) -> Unit,
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            TopAppBar(
                title = { Text("Dashboard") },
                scrollBehavior = scrollBehavior,
            )
        }
    ) { padding ->
        when {
            uiState.error != null -> ErrorScreen(
                message = uiState.error!!,
                onRetry = { viewModel.refresh() },
                modifier = Modifier.padding(padding),
            )
            uiState.isLoading -> LoadingScreen(modifier = Modifier.padding(padding))
            uiState.groups.isEmpty() -> Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = androidx.compose.ui.Alignment.Center,
            ) {
                Text("No active tasks", style = MaterialTheme.typography.bodyLarge)
            }
            else -> PullToRefreshBox(
                isRefreshing = uiState.isLoading,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.padding(padding),
            ) {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    uiState.groups.forEach { group ->
                        item(key = "header-${group.project.id}") {
                            Row(
                                modifier = Modifier.padding(vertical = 8.dp),
                                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                            ) {
                                if (group.project.emoji != null) {
                                    Text(group.project.emoji, style = MaterialTheme.typography.titleMedium)
                                    Spacer(Modifier.width(8.dp))
                                }
                                Text(group.project.title, style = MaterialTheme.typography.titleMedium)
                            }
                        }
                        items(group.tasks, key = { it.id }) { task ->
                            TaskCard(
                                task = task,
                                onClick = { onProjectClick(group.project.id) },
                            )
                        }
                    }
                }
            }
        }
    }
}
```

**Step 3: Commit**

```bash
git add android/app/src/main/java/com/casually/app/ui/dashboard/
git commit -m "feat: add dashboard screen with grouped active tasks"
```

---

### Task 9: Projects Screen

Shows all long-running tasks as cards with FAB to create new.

**Files:**
- Create: `android/app/src/main/java/com/casually/app/ui/projects/ProjectsViewModel.kt`
- Create: `android/app/src/main/java/com/casually/app/ui/projects/ProjectsScreen.kt`

**Step 1: Create ProjectsViewModel**

```kotlin
// android/app/src/main/java/com/casually/app/ui/projects/ProjectsViewModel.kt
package com.casually.app.ui.projects

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.LongRunningTask
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProjectsUiState(
    val isLoading: Boolean = true,
    val projects: List<LongRunningTask> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class ProjectsViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProjectsUiState())
    val uiState = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val projects = taskRepository.getLongTasks()
                _uiState.value = ProjectsUiState(isLoading = false, projects = projects)
            } catch (e: Exception) {
                _uiState.value = ProjectsUiState(
                    isLoading = false,
                    error = e.message ?: "Failed to load",
                )
            }
        }
    }

    fun createProject(title: String, description: String?, emoji: String?, priority: String, state: String) {
        viewModelScope.launch {
            try {
                taskRepository.createLongTask(title, description, emoji, priority, state)
                refresh()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }

    fun deleteProject(id: String) {
        viewModelScope.launch {
            try {
                taskRepository.deleteLongTask(id)
                refresh()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }
}
```

**Step 2: Create ProjectsScreen**

```kotlin
// android/app/src/main/java/com/casually/app/ui/projects/ProjectsScreen.kt
package com.casually.app.ui.projects

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.casually.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectsScreen(
    onProjectClick: (String) -> Unit,
    onCreateProject: () -> Unit,
    viewModel: ProjectsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            TopAppBar(
                title = { Text("Projects") },
                scrollBehavior = scrollBehavior,
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onCreateProject) {
                Icon(Icons.Default.Add, contentDescription = "Create project")
            }
        }
    ) { padding ->
        when {
            uiState.error != null -> ErrorScreen(
                message = uiState.error!!,
                onRetry = { viewModel.refresh() },
                modifier = Modifier.padding(padding),
            )
            uiState.isLoading -> LoadingScreen(modifier = Modifier.padding(padding))
            else -> PullToRefreshBox(
                isRefreshing = uiState.isLoading,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.padding(padding),
            ) {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(uiState.projects, key = { it.id }) { project ->
                        ProjectCard(
                            task = project,
                            onClick = { onProjectClick(project.id) },
                        )
                    }
                }
            }
        }
    }
}
```

**Step 3: Commit**

```bash
git add android/app/src/main/java/com/casually/app/ui/projects/
git commit -m "feat: add projects list screen with FAB"
```

---

### Task 10: Project Detail Screen

Shows a single project with its child tasks. Supports state changes, add/edit/delete tasks.

**Files:**
- Create: `android/app/src/main/java/com/casually/app/ui/projectdetail/ProjectDetailViewModel.kt`
- Create: `android/app/src/main/java/com/casually/app/ui/projectdetail/ProjectDetailScreen.kt`
- Create: `android/app/src/main/java/com/casually/app/ui/components/StateChangeDialog.kt`

**Step 1: Create StateChangeDialog**

```kotlin
// android/app/src/main/java/com/casually/app/ui/components/StateChangeDialog.kt
package com.casually.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.TaskState

@Composable
fun StateChangeDialog(
    currentState: TaskState,
    isProject: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (TaskState) -> Unit,
) {
    val validStates = TaskState.validTransitions(currentState)
    var selected by remember { mutableStateOf(validStates.firstOrNull()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Change State") },
        text = {
            Column {
                if (isProject) {
                    Text(
                        "This will change all child tasks to the same state.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error,
                    )
                    Spacer(Modifier.height(12.dp))
                }
                validStates.forEach { state ->
                    Row(modifier = Modifier.fillMaxWidth()) {
                        RadioButton(
                            selected = state == selected,
                            onClick = { selected = state },
                        )
                        Spacer(Modifier.width(8.dp))
                        TextButton(onClick = { selected = state }) {
                            Text(state.label)
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { selected?.let { onConfirm(it) } },
                enabled = selected != null,
            ) { Text("Confirm") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
    )
}
```

**Step 2: Create ProjectDetailViewModel**

```kotlin
// android/app/src/main/java/com/casually/app/ui/projectdetail/ProjectDetailViewModel.kt
package com.casually.app.ui.projectdetail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.casually.app.data.repository.TaskRepository
import com.casually.app.domain.model.LongRunningTask
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProjectDetailUiState(
    val isLoading: Boolean = true,
    val project: LongRunningTask? = null,
    val error: String? = null,
)

@HiltViewModel
class ProjectDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val taskRepository: TaskRepository,
) : ViewModel() {

    private val projectId: String = savedStateHandle["projectId"]!!

    private val _uiState = MutableStateFlow(ProjectDetailUiState())
    val uiState = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val project = taskRepository.getLongTask(projectId)
                _uiState.value = ProjectDetailUiState(isLoading = false, project = project)
            } catch (e: Exception) {
                _uiState.value = ProjectDetailUiState(
                    isLoading = false,
                    error = e.message ?: "Failed to load",
                )
            }
        }
    }

    fun changeProjectState(state: String) {
        viewModelScope.launch {
            try {
                taskRepository.changeLongTaskState(projectId, state)
                refresh()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }

    fun changeTaskState(taskId: String, state: String) {
        viewModelScope.launch {
            try {
                taskRepository.changeShortTaskState(taskId, state)
                refresh()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }

    fun deleteTask(taskId: String) {
        viewModelScope.launch {
            try {
                taskRepository.deleteShortTask(taskId)
                refresh()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }
}
```

**Step 3: Create ProjectDetailScreen**

```kotlin
// android/app/src/main/java/com/casually/app/ui/projectdetail/ProjectDetailScreen.kt
package com.casually.app.ui.projectdetail

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.casually.app.domain.model.TaskState
import com.casually.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectDetailScreen(
    onBack: () -> Unit,
    onAddTask: (String) -> Unit,
    viewModel: ProjectDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var showStateDialog by remember { mutableStateOf(false) }
    var taskStateDialogId by remember { mutableStateOf<Pair<String, TaskState>?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    val project = uiState.project
                    if (project != null) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (project.emoji != null) {
                                Text(project.emoji)
                                Spacer(Modifier.width(8.dp))
                            }
                            Text(project.title)
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
            )
        },
        floatingActionButton = {
            val project = uiState.project
            if (project != null && project.state != TaskState.BLOCKED && project.state != TaskState.DONE) {
                FloatingActionButton(onClick = { onAddTask(project.id) }) {
                    Icon(Icons.Default.Add, "Add task")
                }
            }
        }
    ) { padding ->
        when {
            uiState.error != null -> ErrorScreen(
                message = uiState.error!!,
                onRetry = { viewModel.refresh() },
                modifier = Modifier.padding(padding),
            )
            uiState.isLoading -> LoadingScreen(modifier = Modifier.padding(padding))
            uiState.project != null -> {
                val project = uiState.project!!
                LazyColumn(
                    modifier = Modifier.padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    // Project header
                    item(key = "header") {
                        Column {
                            if (project.description != null) {
                                Text(
                                    project.description,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Spacer(Modifier.height(8.dp))
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                StateBadge(project.state)
                                Spacer(Modifier.width(8.dp))
                                PriorityDot(project.priority)
                                Spacer(Modifier.width(4.dp))
                                Text(project.priority.label, style = MaterialTheme.typography.labelSmall)
                                Spacer(Modifier.weight(1f))
                                OutlinedButton(onClick = { showStateDialog = true }) {
                                    Text("Change State")
                                }
                            }
                            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                            Text(
                                "${project.children?.size ?: 0} tasks",
                                style = MaterialTheme.typography.titleSmall,
                            )
                        }
                    }

                    // Child tasks
                    val children = project.children ?: emptyList()
                    items(children, key = { it.id }) { task ->
                        TaskCard(
                            task = task,
                            onClick = {
                                taskStateDialogId = Pair(task.id, task.state)
                            },
                        )
                    }
                }
            }
        }
    }

    // Project state change dialog
    if (showStateDialog && uiState.project != null) {
        StateChangeDialog(
            currentState = uiState.project!!.state,
            isProject = true,
            onDismiss = { showStateDialog = false },
            onConfirm = { newState ->
                viewModel.changeProjectState(newState.name)
                showStateDialog = false
            },
        )
    }

    // Task state change dialog
    taskStateDialogId?.let { (taskId, currentState) ->
        StateChangeDialog(
            currentState = currentState,
            isProject = false,
            onDismiss = { taskStateDialogId = null },
            onConfirm = { newState ->
                viewModel.changeTaskState(taskId, newState.name)
                taskStateDialogId = null
            },
        )
    }
}
```

**Step 4: Commit**

```bash
git add android/app/src/main/java/com/casually/app/ui/projectdetail/ android/app/src/main/java/com/casually/app/ui/components/StateChangeDialog.kt
git commit -m "feat: add project detail screen with state changes"
```

---

### Task 11: Create/Edit Bottom Sheets & Settings Screen

Bottom sheets for creating/editing projects and tasks. Settings screen with sign out.

**Files:**
- Create: `android/app/src/main/java/com/casually/app/ui/components/TaskFormSheet.kt`
- Create: `android/app/src/main/java/com/casually/app/ui/settings/SettingsScreen.kt`

**Step 1: Create TaskFormSheet (reused for create/edit project and task)**

```kotlin
// android/app/src/main/java/com/casually/app/ui/components/TaskFormSheet.kt
package com.casually.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.casually.app.domain.model.Priority
import com.casually.app.domain.model.TaskState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskFormSheet(
    title: String,
    initialTitle: String = "",
    initialDescription: String = "",
    initialEmoji: String = "",
    initialPriority: Priority = Priority.MEDIUM,
    initialState: TaskState? = null,
    showStateField: Boolean = false,
    onDismiss: () -> Unit,
    onSubmit: (title: String, description: String?, emoji: String?, priority: String, state: String?) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var taskTitle by remember { mutableStateOf(initialTitle) }
    var taskDescription by remember { mutableStateOf(initialDescription) }
    var taskEmoji by remember { mutableStateOf(initialEmoji) }
    var selectedPriority by remember { mutableStateOf(initialPriority) }
    var selectedState by remember { mutableStateOf(initialState ?: TaskState.WAITING) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(title, style = MaterialTheme.typography.headlineSmall)

            OutlinedTextField(
                value = taskTitle,
                onValueChange = { taskTitle = it },
                label = { Text("Title") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            OutlinedTextField(
                value = taskDescription,
                onValueChange = { taskDescription = it },
                label = { Text("Description (optional)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
            )

            OutlinedTextField(
                value = taskEmoji,
                onValueChange = { taskEmoji = it },
                label = { Text("Emoji (optional)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            // Priority selector
            Text("Priority", style = MaterialTheme.typography.labelLarge)
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                Priority.entries.forEachIndexed { index, priority ->
                    SegmentedButton(
                        shape = SegmentedButtonDefaults.itemShape(index, Priority.entries.size),
                        onClick = { selectedPriority = priority },
                        selected = selectedPriority == priority,
                    ) { Text(priority.label, style = MaterialTheme.typography.labelSmall) }
                }
            }

            // State selector (for projects only)
            if (showStateField) {
                Text("State", style = MaterialTheme.typography.labelLarge)
                SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                    TaskState.entries.forEachIndexed { index, state ->
                        SegmentedButton(
                            shape = SegmentedButtonDefaults.itemShape(index, TaskState.entries.size),
                            onClick = { selectedState = state },
                            selected = selectedState == state,
                        ) { Text(state.label, style = MaterialTheme.typography.labelSmall) }
                    }
                }
            }

            Spacer(Modifier.height(8.dp))
            Button(
                onClick = {
                    onSubmit(
                        taskTitle.trim(),
                        taskDescription.trim().ifEmpty { null },
                        taskEmoji.trim().ifEmpty { null },
                        selectedPriority.name,
                        if (showStateField) selectedState.name else null,
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = taskTitle.isNotBlank(),
            ) { Text("Save") }

            Spacer(Modifier.height(24.dp))
        }
    }
}
```

**Step 2: Create SettingsScreen**

```kotlin
// android/app/src/main/java/com/casually/app/ui/settings/SettingsScreen.kt
package com.casually.app.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.casually.app.data.repository.AuthRepository

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    authRepository: AuthRepository,
    onSignOut: () -> Unit,
) {
    Scaffold(
        topBar = { TopAppBar(title = { Text("Settings") }) }
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        authRepository.userName ?: "User",
                        style = MaterialTheme.typography.titleMedium,
                    )
                    if (authRepository.userEmail != null) {
                        Text(
                            authRepository.userEmail!!,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
            OutlinedButton(
                onClick = {
                    authRepository.signOut()
                    onSignOut()
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Sign Out") }
        }
    }
}
```

**Step 3: Commit**

```bash
git add android/app/src/main/java/com/casually/app/ui/components/TaskFormSheet.kt android/app/src/main/java/com/casually/app/ui/settings/
git commit -m "feat: add task form bottom sheet and settings screen"
```

---

### Task 12: Navigation & Wire Everything Together

Set up Navigation Compose, bottom nav bar, and connect all screens in MainActivity.

**Files:**
- Create: `android/app/src/main/java/com/casually/app/ui/navigation/AppNavigation.kt`
- Modify: `android/app/src/main/java/com/casually/app/MainActivity.kt`

**Step 1: Create AppNavigation**

```kotlin
// android/app/src/main/java/com/casually/app/ui/navigation/AppNavigation.kt
package com.casually.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.casually.app.data.repository.AuthRepository
import com.casually.app.data.repository.TaskRepository
import com.casually.app.ui.components.TaskFormSheet
import com.casually.app.ui.dashboard.DashboardScreen
import com.casually.app.ui.login.LoginScreen
import com.casually.app.ui.projectdetail.ProjectDetailScreen
import com.casually.app.ui.projects.ProjectsScreen
import com.casually.app.ui.settings.SettingsScreen
import kotlinx.coroutines.launch

enum class BottomNavItem(val route: String, val label: String, val icon: ImageVector) {
    Dashboard("dashboard", "Dashboard", Icons.Default.Dashboard),
    Projects("projects", "Projects", Icons.Default.Folder),
    Settings("settings", "Settings", Icons.Default.Settings),
}

@Composable
fun AppNavigation(
    authRepository: AuthRepository,
    taskRepository: TaskRepository,
) {
    val navController = rememberNavController()
    val startRoute = if (authRepository.isLoggedIn) "main" else "login"

    // Bottom sheet state
    var showCreateProject by remember { mutableStateOf(false) }
    var showCreateTask by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    NavHost(navController = navController, startDestination = startRoute) {
        composable("login") {
            LoginScreen(onLoginSuccess = {
                navController.navigate("main") {
                    popUpTo("login") { inclusive = true }
                }
            })
        }

        composable("main") {
            val bottomNavController = rememberNavController()
            val currentBackStack by bottomNavController.currentBackStackEntryAsState()
            val currentRoute = currentBackStack?.destination?.route

            Scaffold(
                bottomBar = {
                    NavigationBar {
                        BottomNavItem.entries.forEach { item ->
                            NavigationBarItem(
                                icon = { Icon(item.icon, item.label) },
                                label = { Text(item.label) },
                                selected = currentRoute == item.route,
                                onClick = {
                                    bottomNavController.navigate(item.route) {
                                        popUpTo(bottomNavController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                            )
                        }
                    }
                }
            ) { padding ->
                NavHost(
                    navController = bottomNavController,
                    startDestination = BottomNavItem.Dashboard.route,
                    modifier = Modifier.padding(padding),
                ) {
                    composable(BottomNavItem.Dashboard.route) {
                        DashboardScreen(
                            onProjectClick = { id -> navController.navigate("project/$id") },
                        )
                    }
                    composable(BottomNavItem.Projects.route) {
                        ProjectsScreen(
                            onProjectClick = { id -> navController.navigate("project/$id") },
                            onCreateProject = { showCreateProject = true },
                        )
                    }
                    composable(BottomNavItem.Settings.route) {
                        SettingsScreen(
                            authRepository = authRepository,
                            onSignOut = {
                                navController.navigate("login") {
                                    popUpTo("main") { inclusive = true }
                                }
                            },
                        )
                    }
                }
            }
        }

        composable(
            "project/{projectId}",
            arguments = listOf(navArgument("projectId") { type = NavType.StringType }),
        ) {
            ProjectDetailScreen(
                onBack = { navController.popBackStack() },
                onAddTask = { parentId -> showCreateTask = parentId },
            )
        }
    }

    // Create project bottom sheet
    if (showCreateProject) {
        TaskFormSheet(
            title = "Create Project",
            showStateField = true,
            onDismiss = { showCreateProject = false },
            onSubmit = { title, desc, emoji, priority, state ->
                scope.launch {
                    taskRepository.createLongTask(title, desc, emoji, priority, state ?: "WAITING")
                    showCreateProject = false
                }
            },
        )
    }

    // Create task bottom sheet
    showCreateTask?.let { parentId ->
        TaskFormSheet(
            title = "Create Task",
            showStateField = false,
            onDismiss = { showCreateTask = null },
            onSubmit = { title, desc, emoji, priority, _ ->
                scope.launch {
                    taskRepository.createShortTask(parentId, title, desc, emoji, priority)
                    showCreateTask = null
                }
            },
        )
    }
}
```

**Step 2: Update MainActivity**

```kotlin
// android/app/src/main/java/com/casually/app/MainActivity.kt
package com.casually.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.casually.app.data.repository.AuthRepository
import com.casually.app.data.repository.TaskRepository
import com.casually.app.ui.navigation.AppNavigation
import com.casually.app.ui.theme.CasuallyTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var authRepository: AuthRepository
    @Inject lateinit var taskRepository: TaskRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CasuallyTheme {
                AppNavigation(
                    authRepository = authRepository,
                    taskRepository = taskRepository,
                )
            }
        }
    }
}
```

**Step 3: Verify build**

```bash
cd android && ./gradlew assembleDebug && cd ..
```
Expected: BUILD SUCCESSFUL

**Step 4: Commit**

```bash
git add android/app/src/main/java/com/casually/app/
git commit -m "feat: add navigation and wire all screens together"
```

---

### Task 13: Glance Widget

Create the home screen widget that shows active projects with their active tasks.

**Files:**
- Create: `android/app/src/main/java/com/casually/app/widget/CasuallyWidget.kt`
- Create: `android/app/src/main/java/com/casually/app/widget/WidgetRefreshWorker.kt`
- Create: `android/app/src/main/java/com/casually/app/widget/WidgetDataProvider.kt`
- Create: `android/app/src/main/res/xml/widget_info.xml`
- Modify: `android/app/src/main/AndroidManifest.xml`

**Step 1: Create WidgetDataProvider**

```kotlin
// android/app/src/main/java/com/casually/app/widget/WidgetDataProvider.kt
package com.casually.app.widget

import android.content.Context
import com.casually.app.data.SessionManager
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.Request

@JsonClass(generateAdapter = true)
data class WidgetProject(
    val id: String,
    val title: String,
    val emoji: String?,
)

@JsonClass(generateAdapter = true)
data class WidgetTask(
    val id: String,
    val title: String,
    val emoji: String?,
    val parentId: String,
)

data class WidgetData(
    val projects: List<WidgetProject>,
    val tasksByProject: Map<String, List<WidgetTask>>,
)

class WidgetDataProvider(private val context: Context) {

    private val moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()
    private val client = OkHttpClient()

    fun fetchData(baseUrl: String, sessionToken: String): WidgetData? {
        return try {
            val projectsJson = fetch("$baseUrl/api/tasks/long?state=ACTIVE", sessionToken) ?: return null
            val tasksJson = fetch("$baseUrl/api/tasks/short?state=ACTIVE", sessionToken) ?: return null

            val projectType = Types.newParameterizedType(List::class.java, WidgetProject::class.java)
            val taskType = Types.newParameterizedType(List::class.java, WidgetTask::class.java)

            val projects = moshi.adapter<List<WidgetProject>>(projectType).fromJson(projectsJson) ?: emptyList()
            val tasks = moshi.adapter<List<WidgetTask>>(taskType).fromJson(tasksJson) ?: emptyList()

            val tasksByProject = tasks.groupBy { it.parentId }
            WidgetData(projects, tasksByProject)
        } catch (e: Exception) {
            null
        }
    }

    private fun fetch(url: String, sessionToken: String): String? {
        val request = Request.Builder()
            .url(url)
            .addHeader("Cookie", "authjs.session-token=$sessionToken")
            .build()

        return client.newCall(request).execute().use { response ->
            if (response.isSuccessful) response.body?.string() else null
        }
    }

    // Cache widget data in SharedPreferences for instant display
    fun saveToCache(data: WidgetData) {
        val prefs = context.getSharedPreferences("widget_cache", Context.MODE_PRIVATE)
        prefs.edit()
            .putString("data", moshi.adapter(WidgetData::class.java).toJson(data))
            .apply()
    }

    fun loadFromCache(): WidgetData? {
        val prefs = context.getSharedPreferences("widget_cache", Context.MODE_PRIVATE)
        val json = prefs.getString("data", null) ?: return null
        return try {
            moshi.adapter(WidgetData::class.java).fromJson(json)
        } catch (e: Exception) {
            null
        }
    }
}
```

**Step 2: Create CasuallyWidget**

```kotlin
// android/app/src/main/java/com/casually/app/widget/CasuallyWidget.kt
package com.casually.app.widget

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.*
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.*
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.casually.app.MainActivity
import com.casually.app.data.SessionManager

class CasuallyWidget : GlanceAppWidget() {

    override val sizeMode = SizeMode.Exact

    @Composable
    override fun Content() {
        val context = LocalContext.current
        val sessionManager = SessionManager(context)
        val provider = WidgetDataProvider(context)
        val data = provider.loadFromCache()

        GlanceTheme {
            Column(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(GlanceTheme.colors.surface)
                    .padding(12.dp)
                    .cornerRadius(16.dp),
            ) {
                // Header
                Row(
                    modifier = GlanceModifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Casually",
                        style = TextStyle(
                            fontWeight = FontWeight.Bold,
                            color = GlanceTheme.colors.onSurface,
                        ),
                        modifier = GlanceModifier.defaultWeight(),
                    )
                }

                Spacer(modifier = GlanceModifier.height(8.dp))

                if (!sessionManager.isLoggedIn) {
                    Text(
                        "Sign in to Casually",
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .clickable(actionStartActivity<MainActivity>()),
                    )
                } else if (data == null || data.projects.isEmpty()) {
                    Text(
                        "No active projects",
                        style = TextStyle(color = GlanceTheme.colors.onSurfaceVariant),
                    )
                } else {
                    LazyColumn {
                        data.projects.forEach { project ->
                            item(itemId = project.id.hashCode().toLong()) {
                                Column(modifier = GlanceModifier.fillMaxWidth().padding(vertical = 4.dp)) {
                                    // Project header
                                    Row(
                                        modifier = GlanceModifier
                                            .fillMaxWidth()
                                            .clickable(actionStartActivity<MainActivity>()),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            "${project.emoji ?: ""} ${project.title}",
                                            style = TextStyle(
                                                fontWeight = FontWeight.Medium,
                                                color = GlanceTheme.colors.onSurface,
                                            ),
                                        )
                                    }

                                    // Tasks under this project
                                    val tasks = data.tasksByProject[project.id] ?: emptyList()
                                    tasks.forEach { task ->
                                        Row(
                                            modifier = GlanceModifier
                                                .fillMaxWidth()
                                                .padding(start = 16.dp, top = 2.dp, bottom = 2.dp)
                                                .clickable(actionStartActivity<MainActivity>()),
                                        ) {
                                            Text(
                                                "${task.emoji ?: "  "} ${task.title}",
                                                style = TextStyle(
                                                    color = GlanceTheme.colors.onSurfaceVariant,
                                                ),
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

class CasuallyWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = CasuallyWidget()
}
```

**Step 3: Create WidgetRefreshWorker**

```kotlin
// android/app/src/main/java/com/casually/app/widget/WidgetRefreshWorker.kt
package com.casually.app.widget

import android.content.Context
import androidx.glance.appwidget.updateAll
import androidx.work.*
import com.casually.app.BuildConfig
import com.casually.app.data.SessionManager
import java.util.concurrent.TimeUnit

class WidgetRefreshWorker(
    private val context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val sessionManager = SessionManager(context)
        val token = sessionManager.sessionToken ?: return Result.success()

        val provider = WidgetDataProvider(context)
        val data = provider.fetchData(BuildConfig.API_BASE_URL, token)

        if (data != null) {
            provider.saveToCache(data)
            CasuallyWidget().updateAll(context)
        }

        return Result.success()
    }

    companion object {
        private const val WORK_NAME = "casually_widget_refresh"

        fun enqueuePeriodicRefresh(context: Context) {
            val request = PeriodicWorkRequestBuilder<WidgetRefreshWorker>(
                30, TimeUnit.MINUTES,
            ).setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            ).build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }

        fun refreshNow(context: Context) {
            val request = OneTimeWorkRequestBuilder<WidgetRefreshWorker>()
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                ).build()

            WorkManager.getInstance(context).enqueue(request)
        }
    }
}
```

**Step 4: Create widget_info.xml**

```xml
<!-- android/app/src/main/res/xml/widget_info.xml -->
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="180dp"
    android:targetCellWidth="3"
    android:targetCellHeight="3"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/app_name"
    android:updatePeriodMillis="1800000" />
```

**Step 5: Update AndroidManifest.xml — add widget receiver**

Add inside `<application>`, after the `<activity>`:

```xml
        <receiver
            android:name=".widget.CasuallyWidgetReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/widget_info" />
        </receiver>
```

**Step 6: Start periodic refresh in CasuallyApp.kt**

Update `CasuallyApp.kt`:

```kotlin
// android/app/src/main/java/com/casually/app/CasuallyApp.kt
package com.casually.app

import android.app.Application
import com.casually.app.widget.WidgetRefreshWorker
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class CasuallyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        WidgetRefreshWorker.enqueuePeriodicRefresh(this)
    }
}
```

**Step 7: Verify build**

```bash
cd android && ./gradlew assembleDebug && cd ..
```
Expected: BUILD SUCCESSFUL

**Step 8: Commit**

```bash
git add android/
git commit -m "feat: add Glance home screen widget with periodic refresh"
```

---

### Task 14: Final Build Verification & .gitignore

Ensure the Android project builds clean and add appropriate .gitignore entries.

**Files:**
- Create: `android/.gitignore`

**Step 1: Create android/.gitignore**

```
*.iml
.gradle
/local.properties
/.idea
.DS_Store
/build
/captures
.externalNativeBuild
.cxx
local.properties
/app/build
```

**Step 2: Full build verification**

```bash
cd android && ./gradlew clean assembleDebug && cd ..
```
Expected: BUILD SUCCESSFUL

**Step 3: Final commit**

```bash
git add android/.gitignore
git commit -m "chore: add Android .gitignore and verify clean build"
```
