package com.casually.app.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.state.updateAppWidgetState

class WidgetTabCallback : ActionCallback {

    companion object {
        val TabKey = ActionParameters.Key<String>("tab")
    }

    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val tab = parameters[TabKey] ?: return

        updateAppWidgetState(context, glanceId) { prefs ->
            prefs[WidgetTabKey] = tab
        }

        CasuallyWidget().update(context, glanceId)
    }
}
