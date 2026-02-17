/**
 * UI-friendly now-playing progress values used by the now playingcard:
 * raw seconds, normalized progress, and preformatted width.
 */
export type NowPlayingProgress = {
	displaySeconds: number
	totalTime: number
	progress: number
	progressWidth: string
}
