package com.casually.app.data

/**
 * Runs [create]; if it throws (e.g. AEADBadTagException / KeyStoreException after a
 * backup restore left the encrypted prefs without a matching Keystore key), calls
 * [onFailure] for logging, [reset] to wipe the broken state, and tries [create] once more.
 *
 * Pure Kotlin on purpose so it can be unit-tested on the JVM without Android.
 */
internal fun <T> createWithRecovery(
    create: () -> T,
    reset: () -> Unit,
    onFailure: (Exception) -> Unit = {},
): T = try {
    create()
} catch (e: Exception) {
    onFailure(e)
    reset()
    create()
}
