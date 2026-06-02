package com.casually.app.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.state.updateAppWidgetState

/**
 * Handles taps on the refresh (↻) button in the widget header.
 * Sets loading flag immediately, then delegates to [WidgetRefreshWorker].
 */
class WidgetRefreshCallback : ActionCallback {

    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        // Show loading spinner immediately on this widget
        updateAppWidgetState(context, glanceId) { prefs ->
            prefs[WidgetKeys.IsLoadingKey] = true
        }
        CasuallyWidget().update(context, glanceId)

        // Kick off a background fetch
        WidgetRefreshWorker.refreshNow(context)
    }
}
