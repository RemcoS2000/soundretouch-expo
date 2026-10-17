import { hexFromArgb, themeFromSourceColor } from '@material/material-color-utilities'

import type { ThemeColors } from './colors'

/**
 * Maps Material's paired light/dark color roles onto the app's accent tokens.
 * Text and neutral surfaces retain their existing appearance and contrast.
 */
export function withArtworkAccent(colors: ThemeColors, source: number | null, dark: boolean): ThemeColors {
	if (source === null) {
		return colors
	}

	const theme = themeFromSourceColor(source)
	const scheme = dark ? theme.schemes.dark : theme.schemes.light

	return {
		...colors,
		accent: hexFromArgb(scheme.primary),
		onAccent: hexFromArgb(scheme.onPrimary),
		accentSurface: hexFromArgb(scheme.primaryContainer),
		onAccentSurface: hexFromArgb(scheme.onPrimaryContainer),
		progressFill: hexFromArgb(scheme.primary),
	}
}
