import type { NowPlaying } from '@soundretouch/api/device'

import React from 'react'
import { Text, View } from 'react-native'

import Slider from '../../design-system/Slider'
import { useAppSettings } from '../../state/AppSettingsContext'

import type { SeekCommand } from './usePlaybackCommands'
import type { usePlaybackProgress } from './usePlaybackProgress'

/** Formats seconds for the current and remaining playback positions. */
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

type TimelineProps = { data: NowPlaying; progress: ReturnType<typeof usePlaybackProgress>; seek: SeekCommand }

/** Previews seeking locally and commits once when the user releases the slider. */
export function PlaybackTimeline({ data, progress, seek }: TimelineProps) {
	const { colors } = useAppSettings()
	const { total, elapsed, seekPreview, setSeekPreview } = progress
	const position = seekPreview ?? elapsed

	if (total <= 0) {
		return null
	}

	return (
		<View>
			<Slider
				accessibilityLabel="Playback position"
				accessibilityValue={{
					min: 0,
					max: total,
					now: Math.floor(position),
					text: `${formatTime(position)} of ${formatTime(total)}`,
				}}
				minimumValue={0}
				maximumValue={total}
				step={1}
				value={position}
				disabled={!data.seekSupported?.value || seek.isPending}
				onValueChange={setSeekPreview}
				onSlidingComplete={(seconds) => {
					setSeekPreview(seconds)
					seek.mutate(seconds, { onSettled: () => setSeekPreview(null) })
				}}
				minimumTrackTintColor={colors.accent}
				maximumTrackTintColor={colors.border}
				thumbTintColor={colors.accent}
				style={{ height: 48 }}
			/>
			<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
				<Text style={{ color: colors.textMuted }}>{formatTime(position)}</Text>
				<Text style={{ color: colors.textMuted }}>−{formatTime(Math.max(0, total - position))}</Text>
			</View>
		</View>
	)
}
