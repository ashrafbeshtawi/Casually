package com.casually.app.widget

import android.content.Context
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.appwidget.updateAll
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.casually.app.BuildConfig
import com.casually.app.data.SessionManager
import kotlinx.coroutines.delay

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

        when (action) {
            "state_change" -> {
                val itemId = inputData.getString("item_id") ?: return Result.failure()
                val itemType = inputData.getString("item_type") ?: return Result.failure()
                val newState = inputData.getString("new_state") ?: return Result.failure()

                val patchSuccess = provider.patchState(baseUrl, token, itemId, itemType, newState)

                if (!patchSuccess) {
                    val freshData = provider.fetchData(baseUrl, token)
                    if (freshData != null) {
                        provider.saveToCache(freshData)
                        clearLoading()
                        CasuallyWidget().updateAll(context)
                    }
                    return Result.retry()
                }

                delay(1000)

                val freshData = provider.fetchData(baseUrl, token)
                if (freshData != null) {
                    provider.saveToCache(freshData)
                }
                clearLoading()
                CasuallyWidget().updateAll(context)
            }
            else -> return Result.failure()
        }

        return Result.success()
    }

    private suspend fun clearLoading() {
        try {
            val manager = GlanceAppWidgetManager(context)
            for (glanceId in manager.getGlanceIds(CasuallyWidget::class.java)) {
                updateAppWidgetState(context, glanceId) { prefs ->
                    prefs[WidgetRefreshCallback.IsLoadingKey] = false
                }
            }
        } catch (_: Exception) {}
    }
}
