package com.casually.app.widget

import android.content.Context
import androidx.glance.appwidget.updateAll
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.casually.app.BuildConfig
import com.casually.app.data.SessionManager

class WidgetActionWorker(
    private val context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val sessionManager = SessionManager(context)
        val token = sessionManager.sessionToken ?: return Result.success()
        val provider = WidgetDataProvider(context)
        val baseUrl = BuildConfig.API_BASE_URL

        val action = inputData.getString("action") ?: return Result.failure()

        val data = when (action) {
            "collapse" -> {
                val projectId = inputData.getString("project_id") ?: return Result.failure()
                val collapsed = inputData.getBoolean("collapsed", false)
                provider.patchLongTask(baseUrl, token, projectId, """{"collapsed":$collapsed}""")
            }
            "state_change" -> {
                val itemId = inputData.getString("item_id") ?: return Result.failure()
                val itemType = inputData.getString("item_type") ?: return Result.failure()
                val newState = inputData.getString("new_state") ?: return Result.failure()
                provider.changeState(baseUrl, token, itemId, itemType, newState)
            }
            else -> return Result.failure()
        }

        if (data != null) {
            provider.saveToCache(data)
            CasuallyWidget().updateAll(context)
        }

        return Result.success()
    }
}
