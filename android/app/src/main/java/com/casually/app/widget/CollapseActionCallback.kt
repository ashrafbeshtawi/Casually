package com.casually.app.widget

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.work.*

class CollapseActionCallback : ActionCallback {

    companion object {
        val ProjectIdKey = ActionParameters.Key<String>("project_id")

        fun collapseKey(projectId: String) = booleanPreferencesKey("collapsed_$projectId")
    }

    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val projectId = parameters[ProjectIdKey] ?: return

        // 1. Toggle collapse in Glance's own DataStore state (atomic with re-render)
        var newCollapsed = false
        updateAppWidgetState(context, glanceId) { prefs ->
            val key = collapseKey(projectId)
            val current = prefs[key] ?: false
            newCollapsed = !current
            prefs[key] = newCollapsed
        }

        // 2. Re-render this specific widget instance
        CasuallyWidget().update(context, glanceId)

        // 3. Fire-and-forget: persist to server in background
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
