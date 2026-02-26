package com.casually.app

import android.app.Application
import com.casually.app.widget.WidgetRefreshWorker
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class CasuallyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        WidgetRefreshWorker.enqueuePeriodicRefresh(this)
    }
}
