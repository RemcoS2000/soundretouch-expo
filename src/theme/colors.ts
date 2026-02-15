export type ThemeColors = {
	background: string
	text: string
	textMuted: string
	icon: string
	artworkFallback: string
	surface: string
	surfaceActive: string
	surfaceElevated: string
	surfaceMuted: string
	border: string
	overlayBackground: string
	progressTrack: string
	progressFill: string
	pill: string
	mutedStrong: string
}

export const lightColors: ThemeColors = {
	background: '#f3f4f6',
	text: '#111',
	textMuted: '#666',
	icon: '#111',
	artworkFallback: '#e5e7eb',
	surface: '#f3f4f6',
	surfaceActive: '#e5e7eb',
	surfaceElevated: '#fff',
	surfaceMuted: '#f8f9fb',
	border: '#e5e7eb',
	overlayBackground: 'rgba(255,255,255,0.54)',
	progressTrack: '#e5e7eb',
	progressFill: '#111',
	pill: '#111',
	mutedStrong: '#666',
}

export const darkColors: ThemeColors = {
	background: '#0f1115',
	text: '#fff',
	textMuted: '#b8c0cc',
	icon: '#fff',
	artworkFallback: '#232a36',
	surface: '#232a36',
	surfaceActive: '#2f3744',
	surfaceElevated: '#1a1f29',
	surfaceMuted: '#232a36',
	border: '#2f3744',
	overlayBackground: 'rgba(3,6,12,0.64)',
	progressTrack: '#2f3744',
	progressFill: '#fff',
	pill: '#2f3744',
	mutedStrong: '#8e99a8',
}
