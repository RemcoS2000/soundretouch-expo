import type { NowPlaying, SoundTouchDevice } from '@soundretouch/api/device'

import { useEffect, useState } from 'react'
import { AppState } from 'react-native'

export const useNowPlaying = (device: SoundTouchDevice | null) => {
	const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
	const visibleNowPlaying = device ? nowPlaying : null

	/**
	 * Loads the initial now playing payload, subscribes to updates,
	 * and refreshes on app resume.
	 */
	useEffect(() => {
		if (!device) return

		let cancelled = false
		let unsubscribe = () => {}

		const applyNowPlaying = (data: NowPlaying | null) => {
			if (cancelled) return
			setNowPlaying(data)
		}

		const subscribe = () => {
			unsubscribe()
			unsubscribe = device.onNowPlayingUpdated(applyNowPlaying)
		}

		const load = async () => {
			try {
				applyNowPlaying(await device.nowPlaying())
			} catch {
				applyNowPlaying(null)
			}
		}

		subscribe()
		void load()

		const appStateSubscription = AppState.addEventListener('change', async (state) => {
			if (state === 'active') {
				// Re-subscribe and refresh when returning from background.
				subscribe()
				await load()
			}
		})

		return () => {
			cancelled = true
			appStateSubscription.remove()
			unsubscribe()
		}
	}, [device])

	return {
		nowPlaying: visibleNowPlaying,
	}
}
