package com.casually.app.widget

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.state.updateAppWidgetState

class WidgetRefreshCallback : ActionCallback {

    companion object {
        val IsLoadingKey = booleanPreferencesKey("widget_is_loading")
    }

    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        // Show loading indicator immediately
        updateAppWidgetState(context, glanceId) { prefs ->
            prefs[IsLoadingKey] = true
        }
        CasuallyWidget().update(context, glanceId)

        // Trigger refresh
        WidgetRefreshWorker.refreshNow(context)
    }
}
