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

        private const val PREFS_NAME = "widget_collapse_state"

        fun isCollapsed(context: Context, projectId: String): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getBoolean(projectId, false)
        }

        fun setCollapsed(context: Context, projectId: String, collapsed: Boolean) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(projectId, collapsed).commit() // commit() for synchronous write
        }

        /** Sync initial collapse state from API data into the prefs (called on data fetch). */
        fun syncFromData(context: Context, projects: List<WidgetProject>) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val editor = prefs.edit()
            for (project in projects) {
                // Only set if not already present — user's local toggle takes priority
                if (!prefs.contains(project.id)) {
                    editor.putBoolean(project.id, project.collapsed == true)
                }
            }
            editor.apply()
        }
    }

    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val projectId = parameters[ProjectIdKey] ?: return

        // 1. Toggle local collapse state (synchronous — guaranteed before updateAll reads it)
        val wasCollapsed = isCollapsed(context, projectId)
        val newCollapsed = !wasCollapsed
        setCollapsed(context, projectId, newCollapsed)

        // 2. Re-render widget — provideGlance will read the updated pref
        CasuallyWidget().updateAll(context)

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
