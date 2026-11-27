package com.casually.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import java.security.KeyStoreException

class EncryptedPrefsRecoveryTest {

    @Test
    fun `returns result without resetting when create succeeds`() {
        var resets = 0

        val result = createWithRecovery(create = { "prefs" }, reset = { resets++ })

        assertEquals("prefs", result)
        assertEquals(0, resets)
    }

    @Test
    fun `resets and retries once when create fails`() {
        var attempts = 0
        var resets = 0
        val failure = KeyStoreException("restored file without key")
        var reported: Exception? = null

        val result = createWithRecovery(
            create = {
                attempts++
                if (resets == 0) throw failure
                "fresh prefs"
            },
            reset = { resets++ },
            onFailure = { reported = it },
        )

        assertEquals("fresh prefs", result)
        assertEquals(2, attempts)
        assertEquals(1, resets)
        assertSame(failure, reported)
    }

    @Test
    fun `propagates the error if create still fails after reset`() {
        var resets = 0

        val thrown = runCatching {
            createWithRecovery<String>(
                create = { throw IllegalStateException("still broken") },
                reset = { resets++ },
            )
        }.exceptionOrNull()

        assertTrue(thrown is IllegalStateException)
        assertEquals(1, resets)
    }
}
