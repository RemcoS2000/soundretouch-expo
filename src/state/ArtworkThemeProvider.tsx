import type { NowPlaying } from '@soundretouch/api/device'
import { useQuery } from '@tanstack/react-query'

import React from 'react'

import { normalizeId, speakerId } from '../features/speakers/identity'
import { useSpeakerResource } from '../features/speakers/queries'
import { sourceColorFromPixels } from '../theme/artwork'
import { artworkPixels } from '../theme/artworkPixels'

import { useActiveSpeaker } from './ActiveSpeakerContext'
import { AppAccentTheme } from './AppSettingsContext'
import { useSoundTouchDevices } from './SoundTouchDevicesContext'

/**
 * Derives the shared accent from the displayed speaker or group master artwork.
 * Artwork keys isolate late results; cached samples avoid resampling on every resource update.
 */
export function ArtworkThemeProvider({ children }: { children: React.ReactNode }) {
	const { foreground } = useSoundTouchDevices()
	const playing = useArtworkPlayback()
	const uri = artworkUri(playing)
	const accent = useArtworkAccent(uri, foreground)

	return <AppAccentTheme source={uri ? (accent.data ?? null) : null}>{children}</AppAccentTheme>
}

/** Uses the selected speaker's current group master for artwork demand. */
function useArtworkPlayback() {
	const { devices } = useSoundTouchDevices()
	const { activeId } = useActiveSpeaker()
	const active = devices.find((entry) => speakerId(entry.device.host, entry.info) === activeId)
	const { data: zone } = useSpeakerResource(active?.device ?? null, 'zone')
	const masterId = normalizeId(zone?.master)
	const master = masterId ? devices.find((entry) => normalizeId(entry.info?.deviceID) === masterId) : undefined
	const controller = master ?? active

	return useSpeakerResource(controller?.device ?? null, 'nowPlaying').data
}

/** Avoids artwork sampling for sources without active media. */
function artworkUri(playing: NowPlaying | undefined) {
	if (!playing || ['STANDBY', 'INVALID_SOURCE'].includes(playing.source ?? '')) {
		return undefined
	}

	return playing.art?.url
}

/** Caches bounded, cancellable artwork samples independently of speaker updates. */
function useArtworkAccent(uri: string | undefined, foreground: boolean) {
	return useQuery({
		queryKey: ['artwork-accent', uri],
		enabled: !!uri && foreground,
		staleTime: Infinity,
		gcTime: 300000,
		retry: false,
		queryFn: async ({ signal }) => {
			const timeout = new AbortController()
			/**
			 * Cancels sampling when its caller stops waiting or its timeout expires.
			 */
			const abort = () => timeout.abort()
			const timer = setTimeout(abort, 8000)

			signal.addEventListener('abort', abort, { once: true })

			try {
				if (signal.aborted) {
					timeout.abort()
				}

				const pixels = await artworkPixels(uri!, timeout.signal)

				if (timeout.signal.aborted) {
					throw new Error('Artwork sampling was cancelled.')
				}

				return sourceColorFromPixels(pixels)
			} finally {
				clearTimeout(timer)
				signal.removeEventListener('abort', abort)
			}
		},
	})
}
