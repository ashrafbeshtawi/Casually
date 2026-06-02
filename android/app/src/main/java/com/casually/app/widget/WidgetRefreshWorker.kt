package com.casually.app.widget

import android.content.Context
import androidx.work.*
import com.casually.app.BuildConfig
import com.casually.app.data.SessionManager
import java.util.concurrent.TimeUnit

/**
 * Fetches fresh data from the API and pushes it into every widget instance's
 * Glance state, then triggers a re-render.
 *
 * Called from three places:
 *   1. enqueuePeriodicRefresh() — 15-minute background poll
 *   2. refreshNow()            — on-demand (refresh button, after mutations)
 *   3. CasuallyWidgetReceiver  — first widget added
 */
class WidgetRefreshWorker(
    private val context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val provider = WidgetDataProvider(context)

        try {
            val token = SessionManager(context).sessionToken ?: return Result.success()
            val data = provider.fetchData(BuildConfig.API_BASE_URL, token)

            if (data != null) {
                // Single atomic update: write fresh data + clear loading
                provider.pushDataAndClearLoading(data)
            } else {
                // Fetch failed — just clear loading so the widget doesn't stay
                // stuck on "Syncing…"
                provider.clearLoading()
            }
        } catch (_: Exception) {
            provider.clearLoading()
        }

        // Re-render all widget instances
        provider.refreshWidgets()

        return Result.success()
    }

    companion object {
        private const val PERIODIC_WORK = "casually_widget_periodic"

        fun enqueuePeriodicRefresh(context: Context) {
            val request = PeriodicWorkRequestBuilder<WidgetRefreshWorker>(
                15, TimeUnit.MINUTES,
            ).setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            ).build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_WORK,
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
