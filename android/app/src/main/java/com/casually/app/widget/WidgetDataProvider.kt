package com.casually.app.widget

import android.content.Context
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.appwidget.updateAll
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

// ── Data Models ──────────────────────────────────────────────────────────────

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
) {
    fun sorted(): WidgetData {
        val order = PRIORITY_ORDER
        return WidgetData(
            projects = projects.sortedBy { order[it.priority] ?: 2 },
            tasksByProject = tasksByProject.mapValues { (_, v) ->
                v.sortedBy { order[it.priority] ?: 2 }
            },
        )
    }

    companion object {
        val PRIORITY_ORDER = mapOf(
            "HIGHEST" to 0, "HIGH" to 1, "MEDIUM" to 2, "LOW" to 3, "LOWEST" to 4,
        )
    }
}

// ── Provider ─────────────────────────────────────────────────────────────────

class WidgetDataProvider(private val context: Context) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .build()

    // ── Serialization (static, no instance state needed) ─────────────────────

    companion object {
        private val moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()
        private val dataAdapter = moshi.adapter(WidgetData::class.java)
        private val projectListType =
            Types.newParameterizedType(List::class.java, WidgetProject::class.java)
        private val taskListType =
            Types.newParameterizedType(List::class.java, WidgetTask::class.java)

        fun serialize(data: WidgetData): String = dataAdapter.toJson(data)

        fun deserialize(json: String): WidgetData? = try {
            dataAdapter.fromJson(json)?.sorted()
        } catch (_: Exception) {
            null
        }
    }

    // ── Network ──────────────────────────────────────────────────────────────

    fun fetchData(baseUrl: String, sessionToken: String): WidgetData? {
        return try {
            val projectsJson =
                httpGet("$baseUrl/api/tasks/long?state=ACTIVE", sessionToken) ?: return null
            val tasksJson =
                httpGet("$baseUrl/api/tasks/short?state=ACTIVE", sessionToken) ?: return null

            val projects =
                moshi.adapter<List<WidgetProject>>(projectListType).fromJson(projectsJson)
                    ?: emptyList()
            val tasks =
                moshi.adapter<List<WidgetTask>>(taskListType).fromJson(tasksJson) ?: emptyList()

            WidgetData(projects, tasks.groupBy { it.parentId }).sorted()
        } catch (_: Exception) {
            null
        }
    }

    fun patchState(
        baseUrl: String,
        sessionToken: String,
        id: String,
        type: String,
        newState: String,
    ): Boolean {
        return try {
            val body = """{"state":"$newState"}""".toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$baseUrl/api/tasks/$type/$id/state")
                .addHeader("Cookie", cookieHeader(sessionToken))
                .patch(body)
                .build()
            client.newCall(request).execute().use { it.isSuccessful }
        } catch (_: Exception) {
            false
        }
    }

    private fun httpGet(url: String, sessionToken: String): String? {
        val request = Request.Builder()
            .url(url)
            .addHeader("Cookie", cookieHeader(sessionToken))
            .build()
        return client.newCall(request).execute().use { response ->
            if (response.isSuccessful) response.body?.string() else null
        }
    }

    private fun cookieHeader(token: String) =
        "__Secure-authjs.session-token=$token; authjs.session-token=$token"

    // ── Glance State Management ──────────────────────────────────────────────
    //
    // ALL widget data is stored in Glance's own preferences (backed by
    // DataStore). This guarantees that currentState<Preferences>() inside
    // provideContent always returns the latest data — no SharedPreferences
    // timing races.

    /**
     * Write data to every widget instance's Glance state, then trigger a
     * re-render.  Also seeds per-project collapse defaults.
     */
    suspend fun pushData(data: WidgetData) {
        val json = serialize(data)
        val manager = GlanceAppWidgetManager(context)
        for (glanceId in manager.getGlanceIds(CasuallyWidget::class.java)) {
            updateAppWidgetState(context, glanceId) { prefs ->
                prefs[WidgetKeys.DataKey] = json
                // Seed collapse defaults for projects we haven't seen yet
                for (project in data.projects) {
                    val key = WidgetKeys.collapseKey(project.id)
                    if (key !in prefs) {
                        prefs[key] = project.collapsed == true
                    }
                }
            }
        }
    }

    /**
     * Set the loading flag on every widget instance.
     */
    suspend fun setLoading(loading: Boolean) {
        val manager = GlanceAppWidgetManager(context)
        for (glanceId in manager.getGlanceIds(CasuallyWidget::class.java)) {
            updateAppWidgetState(context, glanceId) { prefs ->
                prefs[WidgetKeys.IsLoadingKey] = loading
            }
        }
    }

    /**
     * Push data and clear loading in a single atomic state update per widget.
     */
    suspend fun pushDataAndClearLoading(data: WidgetData) {
        val json = serialize(data)
        val manager = GlanceAppWidgetManager(context)
        for (glanceId in manager.getGlanceIds(CasuallyWidget::class.java)) {
            updateAppWidgetState(context, glanceId) { prefs ->
                prefs[WidgetKeys.DataKey] = json
                prefs[WidgetKeys.IsLoadingKey] = false
                for (project in data.projects) {
                    val key = WidgetKeys.collapseKey(project.id)
                    if (key !in prefs) {
                        prefs[key] = project.collapsed == true
                    }
                }
            }
        }
    }

    /**
     * Clear loading on all widgets without changing data.
     */
    suspend fun clearLoading() {
        setLoading(false)
    }

    /**
     * Tell Glance to re-compose every widget instance.
     */
    suspend fun refreshWidgets() {
        CasuallyWidget().updateAll(context)
    }
}
