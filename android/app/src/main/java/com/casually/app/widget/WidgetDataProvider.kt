package com.casually.app.widget

import android.content.Context
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

@JsonClass(generateAdapter = true)
data class WidgetProject(
    val id: String,
    val title: String,
    val emoji: String?,
    val priority: String? = null,
    val state: String? = null,
    val collapsed: Boolean? = false,
)

@JsonClass(generateAdapter = true)
data class WidgetTask(
    val id: String,
    val title: String,
    val emoji: String?,
    val parentId: String,
    val priority: String? = null,
    val state: String? = null,
)

data class WidgetData(
    val projects: List<WidgetProject>,
    val tasksByProject: Map<String, List<WidgetTask>>,
)

class WidgetDataProvider(private val context: Context) {

    private val moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .build()

    fun fetchData(baseUrl: String, sessionToken: String): WidgetData? {
        return try {
            val projectsJson = fetch("$baseUrl/api/tasks/long?state=ACTIVE", sessionToken) ?: return null
            val tasksJson = fetch("$baseUrl/api/tasks/short?state=ACTIVE", sessionToken) ?: return null

            val projectType = Types.newParameterizedType(List::class.java, WidgetProject::class.java)
            val taskType = Types.newParameterizedType(List::class.java, WidgetTask::class.java)

            val projects = moshi.adapter<List<WidgetProject>>(projectType).fromJson(projectsJson) ?: emptyList()
            val tasks = moshi.adapter<List<WidgetTask>>(taskType).fromJson(tasksJson) ?: emptyList()

            val priorityOrder = mapOf("HIGHEST" to 0, "HIGH" to 1, "MEDIUM" to 2, "LOW" to 3, "LOWEST" to 4)
            val sortedProjects = projects.sortedBy { priorityOrder[it.priority] ?: 2 }
            val tasksByProject = tasks.groupBy { it.parentId }
                .mapValues { (_, v) -> v.sortedBy { priorityOrder[it.priority] ?: 2 } }
            WidgetData(sortedProjects, tasksByProject)
        } catch (e: Exception) {
            null
        }
    }

    private fun fetch(url: String, sessionToken: String): String? {
        // Send both cookie names: secure (HTTPS/Vercel) and plain (local dev)
        val request = Request.Builder()
            .url(url)
            .addHeader("Cookie", "__Secure-authjs.session-token=$sessionToken; authjs.session-token=$sessionToken")
            .build()

        return client.newCall(request).execute().use { response ->
            if (response.isSuccessful) response.body?.string() else null
        }
    }

    /**
     * Send state change PATCH to server. Returns true if the server accepted it.
     */
    fun patchState(baseUrl: String, sessionToken: String, id: String, type: String, newState: String): Boolean {
        return try {
            val json = """{"state":"$newState"}"""
            val body = json.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$baseUrl/api/tasks/$type/$id/state")
                .addHeader("Cookie", "__Secure-authjs.session-token=$sessionToken; authjs.session-token=$sessionToken")
                .patch(body)
                .build()
            val response = client.newCall(request).execute()
            val success = response.isSuccessful
            response.close()
            success
        } catch (e: Exception) {
            false
        }
    }

    /**
     * PATCH a single field on a long task and re-fetch all data.
     */
    fun patchLongTask(baseUrl: String, sessionToken: String, id: String, jsonBody: String): WidgetData? {
        return try {
            val body = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$baseUrl/api/tasks/long/$id")
                .addHeader("Cookie", "__Secure-authjs.session-token=$sessionToken; authjs.session-token=$sessionToken")
                .patch(body)
                .build()
            val response = client.newCall(request).execute()
            response.close()
            fetchData(baseUrl, sessionToken)
        } catch (e: Exception) {
            null
        }
    }

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
            val data = moshi.adapter(WidgetData::class.java).fromJson(json) ?: return null
            val priorityOrder = mapOf("HIGHEST" to 0, "HIGH" to 1, "MEDIUM" to 2, "LOW" to 3, "LOWEST" to 4)
            WidgetData(
                projects = data.projects.sortedBy { priorityOrder[it.priority] ?: 2 },
                tasksByProject = data.tasksByProject.mapValues { (_, v) ->
                    v.sortedBy { priorityOrder[it.priority] ?: 2 }
                },
            )
        } catch (e: Exception) {
            null
        }
    }
}
