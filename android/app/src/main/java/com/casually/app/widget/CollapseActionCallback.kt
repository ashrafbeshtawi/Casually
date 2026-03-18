package com.casually.app.widget

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.state.updateAppWidgetState

class CollapseActionCallback : ActionCallback {

    companion object {
        val ProjectIdKey = ActionParameters.Key<String>("project_id")

        fun collapseKey(projectId: String) = booleanPreferencesKey("collapsed_$projectId")
    }

    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val projectId = parameters[ProjectIdKey] ?: return

        // 1. Toggle collapse in Glance's own DataStore state (atomic with re-render)
        updateAppWidgetState(context, glanceId) { prefs ->
            val key = collapseKey(projectId)
            val current = prefs[key] ?: false
            prefs[key] = !current
        }

        // 2. Re-render this specific widget instance
        CasuallyWidget().update(context, glanceId)

        // No server sync — collapse is local per panel
    }
}
