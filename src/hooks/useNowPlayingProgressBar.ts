import type { SoundTouchDevice } from '@soundretouch/api/device'

import { useCallback, useEffect, useState } from 'react'
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native'

import { useNowPlaying } from './useNowPlaying'
import { useUserTrackControl } from './useUserTrackControl'

const toPercent = (value: number): `${number}%` => `${Number(value.toFixed(2))}%`

export const useNowPlayingProgressBar = (device: SoundTouchDevice | null) => {
	const { nowPlaying } = useNowPlaying(device)
	const { seekToTime } = useUserTrackControl(device)
	const displaySeconds = Number(nowPlaying?.time?.elapsed ?? 0) || 0
	/*
	 * The device only reports play time at coarse intervals, so we keep an interpolated
	 * progress state for smoother UI progress between updates.
	 */
	const totalTime = Number(nowPlaying?.time?.total ?? 0) || 0
	const isPlaying = nowPlaying?.playStatus === 'PLAY_STATE'
	const canSeek = Boolean(nowPlaying?.seekSupported) && totalTime > 0

	/*
	 * Keep progress shape creation in one place so initial state, interpolation,
	 * and seek updates all use the same calculation.
	 */
	const createProgressState = useCallback((seconds: number, total: number) => {
		const progress = total ? Math.min(1, seconds / total) : 0
		return {
			displaySeconds: seconds,
			totalTime: total,
			progress,
			progressWidth: toPercent(progress * 100),
		}
	}, [])

	const [nowPlayingProgress, setNowPlayingProgress] = useState({
		...createProgressState(displaySeconds, totalTime),
	})
	const [progressBarWidth, setProgressBarWidth] = useState(0)
	const [seekRatio, setSeekRatio] = useState<number | null>(null)

	/*
	 * Sync progress state whenever the device reports a fresh elapsed/total time payload.
	 */
	useEffect(() => {
		setNowPlayingProgress(createProgressState(displaySeconds, totalTime))
	}, [createProgressState, displaySeconds, totalTime])

	/*
	 * Advance the displayed progress between coarse device updates so the UI progress bar
	 * keeps moving while playback is active.
	 */
	useEffect(() => {
		if (!isPlaying) return

		const step = 0.25
		const intervalId = setInterval(() => {
			setNowPlayingProgress((current) => {
				const nextDisplaySeconds = totalTime ? Math.min(totalTime, current.displaySeconds + step) : current.displaySeconds + step
				return createProgressState(nextDisplaySeconds, totalTime)
			})
		}, step * 1000)

		return () => clearInterval(intervalId)
	}, [createProgressState, isPlaying, totalTime])

	const displayProgressWidth = seekRatio === null ? nowPlayingProgress.progressWidth : toPercent(seekRatio * 100)

	const onProgressBarLayout = useCallback((event: LayoutChangeEvent) => {
		setProgressBarWidth(event.nativeEvent.layout.width)
	}, [])

	/*
	 * During drag we only update the visual ratio; on release we commit seek to the device
	 * and update local progress immediately for responsive feedback.
	 */
	const applySeek = useCallback(
		async (locationX: number, commit: boolean) => {
			if (!canSeek || !progressBarWidth) return
			const ratio = Math.max(0, Math.min(1, locationX / progressBarWidth))
			setSeekRatio(ratio)
			if (!commit) return

			const targetSeconds = Math.round(ratio * totalTime)
			setNowPlayingProgress(createProgressState(targetSeconds, totalTime))

			await seekToTime(targetSeconds)
		},
		[canSeek, createProgressState, progressBarWidth, seekToTime, totalTime]
	)

	const onSeekMove = useCallback((event: GestureResponderEvent) => void applySeek(event.nativeEvent.locationX, false), [applySeek])

	const onSeekRelease = useCallback(
		(event: GestureResponderEvent) => {
			void applySeek(event.nativeEvent.locationX, true)
			setSeekRatio(null)
		},
		[applySeek]
	)

	const onSeekTerminate = useCallback(() => {
		setSeekRatio(null)
	}, [])

	return {
		canSeek,
		displayProgressWidth,
		onProgressBarLayout,
		seekResponderProps: {
			onStartShouldSetResponder: () => canSeek,
			onMoveShouldSetResponder: () => canSeek,
			onResponderGrant: onSeekMove,
			onResponderMove: onSeekMove,
			onResponderRelease: onSeekRelease,
			onResponderTerminate: onSeekTerminate,
		},
	}
}
