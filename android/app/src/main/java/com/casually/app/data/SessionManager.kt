package com.casually.app.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import java.security.KeyStore
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext context: Context
) {
    // If the prefs file can't be decrypted (typically after a device backup restore,
    // where the file came back but the Keystore master key did not), wipe it and the
    // key and start fresh: the user just has to sign in again instead of crashing.
    private val prefs: SharedPreferences = createWithRecovery(
        create = { createEncryptedPrefs(context) },
        reset = { resetEncryptedPrefs(context) },
        onFailure = { Log.w(TAG, "Session storage unreadable, resetting it", it) },
    )

    var sessionToken: String?
        get() = prefs.getString("session_token", null)
        set(value) = prefs.edit().putString("session_token", value).apply()

    var userName: String?
        get() = prefs.getString("user_name", null)
        set(value) = prefs.edit().putString("user_name", value).apply()

    var userEmail: String?
        get() = prefs.getString("user_email", null)
        set(value) = prefs.edit().putString("user_email", value).apply()

    var userImage: String?
        get() = prefs.getString("user_image", null)
        set(value) = prefs.edit().putString("user_image", value).apply()

    val isLoggedIn: Boolean get() = sessionToken != null

    fun clear() {
        prefs.edit().clear().apply()
    }

    private companion object {
        const val TAG = "SessionManager"
        const val PREFS_NAME = "casually_session"

        fun createEncryptedPrefs(context: Context): SharedPreferences {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            return EncryptedSharedPreferences.create(
                context,
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
            )
        }

        fun resetEncryptedPrefs(context: Context) {
            context.deleteSharedPreferences(PREFS_NAME)
            // The master key is only used for these prefs, so dropping it is safe and
            // covers the case where the Keystore entry itself is unusable.
            runCatching {
                KeyStore.getInstance("AndroidKeyStore").apply {
                    load(null)
                    deleteEntry(MasterKey.DEFAULT_MASTER_KEY_ALIAS)
                }
            }.onFailure { Log.w(TAG, "Could not delete master key", it) }
        }
    }
}
