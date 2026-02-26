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
