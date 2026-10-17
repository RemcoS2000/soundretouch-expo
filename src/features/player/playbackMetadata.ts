import type { NowPlaying } from '@soundretouch/api/device'

/** Identifies sources whose transport controls can be used. */
export function isPlaybackAvailable(data: NowPlaying | undefined): data is NowPlaying {
	return !!data && !['STANDBY', 'AUX', 'INVALID_SOURCE'].includes(data.source ?? '')
}

/** Uses the track or source item name before falling back to a contextual label. */
export function trackLabel(data: NowPlaying | undefined, fallback: string): string {
	return data?.track || data?.ContentItem?.itemName || fallback
}

/** Describes standby separately from the current track in compact speaker views. */
export function compactTitle(data: NowPlaying | undefined, fallback: string): string {
	if (data?.source === 'STANDBY') {
		return 'Standby'
	}

	return trackLabel(data, fallback)
}

/** Produces the shared transport label and icon from the reported playback state. */
export function playbackAction(data: NowPlaying | undefined): { label: string; icon: 'pause' | 'play-arrow' } {
	if (data?.playStatus === 'PLAY_STATE') {
		return { label: 'Pause', icon: 'pause' }
	}

	return { label: 'Play', icon: 'play-arrow' }
}

/** Joins available artist and album metadata without leaving empty separators. */
export function artistAlbumLabel(data: NowPlaying | undefined): string {
	return [data?.artist, data?.album].filter(Boolean).join(' · ')
}
