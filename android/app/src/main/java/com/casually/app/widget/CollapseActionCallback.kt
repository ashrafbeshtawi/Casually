package com.casually.app.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.state.updateAppWidgetState

/** Toggles collapse state for a single project within one widget instance. */
class CollapseActionCallback : ActionCallback {

    companion object {
        val ProjectIdKey = ActionParameters.Key<String>("project_id")
    }

    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        val projectId = parameters[ProjectIdKey] ?: return

        updateAppWidgetState(context, glanceId) { prefs ->
            val key = WidgetKeys.collapseKey(projectId)
            prefs[key] = !(prefs[key] ?: false)
        }
        CasuallyWidget().update(context, glanceId)
    }
}
