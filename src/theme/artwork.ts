import { argbFromRgb, hexFromArgb, QuantizerCelebi, Score, themeFromSourceColor } from '@material/material-color-utilities'

import type { ThemeColors } from './colors'

/**
 * Uses Material's established quantizer and scoring to select a theme seed from image pixels.
 * Transparent pixels are excluded and monochrome artwork keeps the neutral fallback.
 */
export function sourceColorFromPixels(bytes: Uint8ClampedArray): number | null {
	const pixels: number[] = []

	for (let index = 0; index + 3 < bytes.length; index += 4) {
		if (bytes[index + 3] === 255) {
			pixels.push(argbFromRgb(bytes[index] ?? 0, bytes[index + 1] ?? 0, bytes[index + 2] ?? 0))
		}
	}

	if (!pixels.length) {
		return null
	}

	const palette = QuantizerCelebi.quantize(pixels, 128)
	const [source] = Score.score(palette, { desired: 1, fallbackColorARGB: 0 })

	return source || null
}

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
