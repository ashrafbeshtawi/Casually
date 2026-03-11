package com.casually.app.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.updateAll
import androidx.work.*

class CollapseActionCallback : ActionCallback {

    companion object {
        val ProjectIdKey = ActionParameters.Key<String>("project_id")
        val CurrentCollapsedKey = ActionParameters.Key<Boolean>("current_collapsed")
    }

    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val projectId = parameters[ProjectIdKey] ?: return
        val currentCollapsed = parameters[CurrentCollapsedKey] ?: false
        val newCollapsed = !currentCollapsed

        val provider = WidgetDataProvider(context)

        // Optimistic: update cache immediately
        val cached = provider.loadFromCache()
        if (cached != null) {
            val optimistic = cached.copy(
                projects = cached.projects.map {
                    if (it.id == projectId) it.copy(collapsed = newCollapsed) else it
                }
            )
            provider.saveToCache(optimistic)
        }

        // Re-render widget with updated cache
        CasuallyWidget().updateAll(context)

        // Fire background work to persist to server
        val workData = workDataOf(
            "action" to "collapse",
            "project_id" to projectId,
            "collapsed" to newCollapsed,
        )
        val request = OneTimeWorkRequestBuilder<WidgetActionWorker>()
            .setInputData(workData)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context).enqueue(request)
    }
}
