package com.casually.app.widget

import android.content.Context
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.state.updateAppWidgetState
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
        }

        // Clear loading flag on all widget instances
        try {
            val manager = GlanceAppWidgetManager(context)
            for (glanceId in manager.getGlanceIds(CasuallyWidget::class.java)) {
                updateAppWidgetState(context, glanceId) { prefs ->
                    prefs[WidgetRefreshCallback.IsLoadingKey] = false
                }
            }
        } catch (_: Exception) {}

        CasuallyWidget().updateAll(context)

        return Result.success()
    }

    companion object {
        private const val WORK_NAME = "casually_widget_refresh"

        fun enqueuePeriodicRefresh(context: Context) {
            val request = PeriodicWorkRequestBuilder<WidgetRefreshWorker>(
                15, TimeUnit.MINUTES,
            ).setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            ).build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
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
