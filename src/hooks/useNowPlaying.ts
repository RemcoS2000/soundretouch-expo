import type { NowPlaying, SoundTouchDevice } from '@soundretouch/api/device'

import { useEffect, useState } from 'react'
import { AppState } from 'react-native'

import type { NowPlayingProgress } from '../types/NowPlayingProgress'

export const useNowPlaying = (device: SoundTouchDevice | null) => {
	const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
	const [nowPlayingProgress, setNowPlayingProgress] = useState<NowPlayingProgress>({
		displaySeconds: 0,
		totalTime: 0,
		progress: 0,
		progressWidth: '0.00%',
	})
	const visibleNowPlaying = device ? nowPlaying : null
	const artUrl = visibleNowPlaying?.art?.['#text']

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
			const displaySeconds = Number(data?.time?.['#text'] ?? 0) || 0
			const totalTime = Number(data?.time?.total ?? 0) || 0
			const progress = totalTime ? Math.min(1, displaySeconds / totalTime) : 0
			setNowPlayingProgress({
				displaySeconds,
				totalTime,
				progress,
				progressWidth: `${(progress * 100).toFixed(2)}%`,
			})
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

	/*
	 * The device only reports play time at coarse intervals, so we keep an interpolated
	 * progress state for smoother UI progress between updates.
	 */
	const totalTime = Number(visibleNowPlaying?.time?.total ?? 0) || 0
	const isPlaying = visibleNowPlaying?.playStatus === 'PLAY_STATE'

	useEffect(() => {
		if (!isPlaying) return
		const step = 0.25
		const intervalId = setInterval(() => {
			setNowPlayingProgress((current) => {
				const nextDisplaySeconds = totalTime ? Math.min(totalTime, current.displaySeconds + step) : current.displaySeconds + step
				const progress = totalTime ? Math.min(1, nextDisplaySeconds / totalTime) : 0
				return {
					displaySeconds: nextDisplaySeconds,
					totalTime,
					progress,
					progressWidth: `${(progress * 100).toFixed(2)}%`,
				}
			})
		}, step * 1000)
		return () => clearInterval(intervalId)
	}, [isPlaying, totalTime])

	return {
		artUrl,
		nowPlaying: visibleNowPlaying,
		nowPlayingProgress,
	}
}
