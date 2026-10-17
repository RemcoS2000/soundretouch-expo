import type { NowPlaying, SoundTouchKey } from '@soundretouch/api/device'

import React from 'react'
import { View } from 'react-native'

import { IconButton } from '../../design-system/Screen'

import { playbackAction } from './playbackMetadata'
import type { PlaybackCommand } from './usePlaybackCommands'

type ControlProps = { data: NowPlaying; command: PlaybackCommand }

/** Preserves transport order while each pressed control owns its own pending state. */
export function PlaybackControls({ data, command }: ControlProps) {
	const action = playbackAction(data)

	return (
		<View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', marginVertical: 16 }}>
			<ShuffleControl data={data} command={command} />
			<IconButton
				label="Previous"
				icon="skip-previous"
				disabled={command.isPendingFor('PREV_TRACK') || String(data.skipPreviousEnabled) === 'false'}
				onPress={() => command.mutate('PREV_TRACK')}
			/>
			<IconButton
				label={action.label}
				icon={action.icon}
				prominent
				loading={command.pendingInputs.length > 0}
				disabled={command.isPendingFor('PLAY_PAUSE')}
				onPress={() => command.mutate('PLAY_PAUSE')}
			/>
			<IconButton
				label="Next"
				icon="skip-next"
				disabled={command.isPendingFor('NEXT_TRACK') || String(data.skipEnabled) === 'false'}
				onPress={() => command.mutate('NEXT_TRACK')}
			/>
			<RepeatControl data={data} command={command} />
		</View>
	)
}

/** Toggles shuffle without blocking unrelated transport commands. */
function ShuffleControl({ data, command }: ControlProps) {
	return (
		<IconButton
			label={`Shuffle ${data.shuffleSetting === 'SHUFFLE_ON' ? 'on' : 'off'}`}
			icon="shuffle"
			selected={data.shuffleSetting === 'SHUFFLE_ON'}
			disabled={SHUFFLE_KEYS.some(command.isPendingFor)}
			onPress={() => command.mutate(data.shuffleSetting === 'SHUFFLE_ON' ? 'SHUFFLE_OFF' : 'SHUFFLE_ON')}
		/>
	)
}

/** Cycles the reported repeat mode and disables only its pending command family. */
function RepeatControl({ data, command }: ControlProps) {
	return (
		<IconButton
			label={`Repeat ${REPEAT_LABELS[data.repeatSetting ?? ''] ?? 'off'}`}
			icon={data.repeatSetting === 'REPEAT_ONE' ? 'repeat-one' : 'repeat'}
			selected={data.repeatSetting === 'REPEAT_ALL' || data.repeatSetting === 'REPEAT_ONE'}
			disabled={REPEAT_KEYS.some(command.isPendingFor)}
			onPress={() => command.mutate(NEXT_REPEAT[data.repeatSetting ?? ''] ?? 'REPEAT_OFF')}
		/>
	)
}

const SHUFFLE_KEYS = ['SHUFFLE_ON', 'SHUFFLE_OFF'] as const
const REPEAT_KEYS = ['REPEAT_OFF', 'REPEAT_ALL', 'REPEAT_ONE'] as const
const REPEAT_LABELS: Record<string, string> = { REPEAT_ONE: 'one', REPEAT_ALL: 'all' }
const NEXT_REPEAT: Record<string, SoundTouchKey> = { REPEAT_OFF: 'REPEAT_ALL', REPEAT_ALL: 'REPEAT_ONE' }
