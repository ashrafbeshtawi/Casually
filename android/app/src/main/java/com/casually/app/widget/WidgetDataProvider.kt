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

@JsonClass(generateAdapter = true)
data class WidgetProject(
    val id: String,
    val title: String,
    val emoji: String?,
    val priority: String? = null,
    val state: String? = null,
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
     * Change the state of a project (long) or task (short) and re-fetch all data.
     * @param type "long" or "short"
     */
    fun changeState(baseUrl: String, sessionToken: String, id: String, type: String, newState: String): WidgetData? {
        return try {
            val json = """{"state":"$newState"}"""
            val body = json.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$baseUrl/api/tasks/$type/$id/state")
                .addHeader("Cookie", "__Secure-authjs.session-token=$sessionToken; authjs.session-token=$sessionToken")
                .patch(body)
                .build()
            val response = client.newCall(request).execute()
            response.close()

            // Re-fetch all data after state change
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
            moshi.adapter(WidgetData::class.java).fromJson(json)
        } catch (e: Exception) {
            null
        }
    }
}
