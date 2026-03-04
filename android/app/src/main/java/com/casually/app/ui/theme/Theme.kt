package com.casually.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Brand colors
val CasuallyPurple = Color(0xFF6D5FF5)
val CasuallyPurpleLight = Color(0xFF8B80F8)
val CasuallyPurpleDark = Color(0xFF5549C7)
val CasuallyPurpleContainer = Color(0xFFE8E5FD)
val CasuallyPurpleContainerDark = Color(0xFF2D2666)

// State colors
val StateGreen = Color(0xFF22C55E)
val StateGreenDark = Color(0xFF4ADE80)
val StateAmber = Color(0xFFEAB308)
val StateAmberDark = Color(0xFFFACC15)
val StateRed = Color(0xFFEF4444)
val StateRedDark = Color(0xFFF87171)
val StateGray = Color(0xFF6B7280)
val StateGrayDark = Color(0xFF9CA3AF)

enum class ThemeMode { SYSTEM, LIGHT, DARK }

val LocalThemeMode = compositionLocalOf { ThemeMode.SYSTEM }

private val CasuallyLightColors = lightColorScheme(
    primary = CasuallyPurple,
    onPrimary = Color.White,
    primaryContainer = CasuallyPurpleContainer,
    onPrimaryContainer = CasuallyPurpleDark,
    secondary = Color(0xFF625B71),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE8DEF8),
    onSecondaryContainer = Color(0xFF1D192B),
    tertiary = StateGreen,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFDCFCE7),
    onTertiaryContainer = Color(0xFF166534),
    error = StateRed,
    onError = Color.White,
    errorContainer = Color(0xFFFEE2E2),
    onErrorContainer = Color(0xFF991B1B),
    background = Color(0xFFF8F7FC),
    onBackground = Color(0xFF1C1B1F),
    surface = Color.White,
    onSurface = Color(0xFF1C1B1F),
    surfaceVariant = Color(0xFFF3F0FA),
    onSurfaceVariant = Color(0xFF49454F),
    outline = Color(0xFFDDD8E4),
    outlineVariant = Color(0xFFECE6F0),
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color(0xFFF8F7FC),
    surfaceContainer = Color(0xFFF3F0FA),
    surfaceContainerHigh = Color(0xFFEDE9F4),
    surfaceContainerHighest = Color(0xFFE7E3EE),
)

private val CasuallyDarkColors = darkColorScheme(
    primary = CasuallyPurpleLight,
    onPrimary = Color(0xFF1E1647),
    primaryContainer = CasuallyPurpleContainerDark,
    onPrimaryContainer = CasuallyPurpleLight,
    secondary = Color(0xFFCCC2DC),
    onSecondary = Color(0xFF332D41),
    secondaryContainer = Color(0xFF4A4458),
    onSecondaryContainer = Color(0xFFE8DEF8),
    tertiary = StateGreenDark,
    onTertiary = Color(0xFF003919),
    tertiaryContainer = Color(0xFF1A4D2E),
    onTertiaryContainer = StateGreenDark,
    error = StateRedDark,
    onError = Color(0xFF601410),
    errorContainer = Color(0xFF5C1A1A),
    onErrorContainer = StateRedDark,
    background = Color(0xFF141218),
    onBackground = Color(0xFFE6E1E5),
    surface = Color(0xFF1C1B1F),
    onSurface = Color(0xFFE6E1E5),
    surfaceVariant = Color(0xFF252330),
    onSurfaceVariant = Color(0xFFCAC4D0),
    outline = Color(0xFF49454F),
    outlineVariant = Color(0xFF322F3A),
    surfaceContainerLowest = Color(0xFF0F0D13),
    surfaceContainerLow = Color(0xFF1C1B1F),
    surfaceContainer = Color(0xFF211F26),
    surfaceContainerHigh = Color(0xFF2B2930),
    surfaceContainerHighest = Color(0xFF36343B),
)

private val CasuallyTypography = Typography(
    displayLarge = TextStyle(fontSize = 57.sp, fontWeight = FontWeight.SemiBold, lineHeight = 64.sp),
    displayMedium = TextStyle(fontSize = 45.sp, fontWeight = FontWeight.SemiBold, lineHeight = 52.sp),
    displaySmall = TextStyle(fontSize = 36.sp, fontWeight = FontWeight.SemiBold, lineHeight = 44.sp),
    headlineLarge = TextStyle(fontSize = 32.sp, fontWeight = FontWeight.SemiBold, lineHeight = 40.sp),
    headlineMedium = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.SemiBold, lineHeight = 36.sp),
    headlineSmall = TextStyle(fontSize = 24.sp, fontWeight = FontWeight.SemiBold, lineHeight = 32.sp),
    titleLarge = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.SemiBold, lineHeight = 28.sp),
    titleMedium = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold, lineHeight = 24.sp, letterSpacing = 0.15.sp),
    titleSmall = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.SemiBold, lineHeight = 20.sp, letterSpacing = 0.1.sp),
    bodyLarge = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Normal, lineHeight = 24.sp, letterSpacing = 0.15.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Normal, lineHeight = 20.sp, letterSpacing = 0.25.sp),
    bodySmall = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Normal, lineHeight = 16.sp, letterSpacing = 0.4.sp),
    labelLarge = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Medium, lineHeight = 20.sp, letterSpacing = 0.1.sp),
    labelMedium = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium, lineHeight = 16.sp, letterSpacing = 0.5.sp),
    labelSmall = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium, lineHeight = 16.sp, letterSpacing = 0.5.sp),
)

private val CasuallyShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(24.dp),
)

@Composable
fun CasuallyTheme(
    themeMode: ThemeMode = ThemeMode.SYSTEM,
    content: @Composable () -> Unit,
) {
    val darkTheme = when (themeMode) {
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
    }

    val colorScheme = if (darkTheme) CasuallyDarkColors else CasuallyLightColors

    MaterialTheme(
        colorScheme = colorScheme,
        typography = CasuallyTypography,
        shapes = CasuallyShapes,
        content = content,
    )
}
