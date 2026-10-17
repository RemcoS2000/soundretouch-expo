import type { NowPlaying } from '@soundretouch/api/device'

import { useIsFocused } from 'expo-router'
import { useEffect, useState } from 'react'

import { useSoundTouchDevices } from '../../state/SoundTouchDevicesContext'

/** Normalizes optional timing fields once before computing interpolated progress. */
function playbackTiming(data: NowPlaying | undefined) {
	return {
		total: Math.max(0, Number(data?.time?.total ?? 0)),
		elapsed: Number(data?.time?.elapsed ?? 0),
		playing: data?.playStatus === 'PLAY_STATE',
	}
}

/** Advances timestamps only for foreground playback and retains local seek previews. */
export function usePlaybackProgress(data: NowPlaying | undefined, updatedAt: number) {
	const { foreground } = useSoundTouchDevices()
	const focused = useIsFocused()
	const [clock, setClock] = useState(() => Date.now())
	const [seekPreview, setSeekPreview] = useState<number | null>(null)
	const timing = playbackTiming(data)

	useEffect(() => {
		if (!focused || !foreground || !timing.playing) {
			return
		}
		const timer = setInterval(() => setClock(Date.now()), 1000)

		return () => clearInterval(timer)
	}, [foreground, focused, timing.playing])
	const advancement = timing.playing ? Math.max(0, clock - updatedAt) / 1000 : 0
	const elapsed = Math.min(timing.total || Infinity, Math.max(0, timing.elapsed + advancement))

	return { total: timing.total, elapsed, seekPreview, setSeekPreview }
}
