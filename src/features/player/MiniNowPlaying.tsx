import type { SoundTouchDevice } from '@soundretouch/api/device'

import React from 'react'
import { Text, View } from 'react-native'

import { errorMessage, IconButton, Notice } from '../../design-system/Screen'
import { useAppSettings } from '../../state/AppSettingsContext'
import { useSpeakerCommand } from '../speakers/commands'
import { useSpeakerResource } from '../speakers/queries'

import { PlaybackArtwork } from './PlaybackArtwork'
import { compactTitle, isPlaybackAvailable, playbackAction } from './playbackMetadata'

/**
 * Keeps artwork, current audio and playback available above the expanded mobile sheet.
 * It observes the existing cache and routes grouped playback through the master device.
 */
export function MiniNowPlaying({ device, active }: { device: SoundTouchDevice | null; active: boolean }) {
	const { colors } = useAppSettings()
	const { data } = useSpeakerResource(device, 'nowPlaying', active)
	const playback = useSpeakerCommand(device, (speaker) => speaker.keyPressAndRelease('PLAY_PAUSE'), ['nowPlaying'], { relative: true })

	const artwork = data?.art?.url
	const playable = isPlaybackAvailable(data)
	const title = compactTitle(data, data?.source === 'AUX' ? 'AUX audio' : 'No audio playing')
	const action = playbackAction(data)

	return (
		<View>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 }}>
				<PlaybackArtwork url={artwork} style={{ width: 48, height: 48, borderRadius: 12 }} transition={200} label="Current audio artwork" />
				<View style={{ flex: 1, minWidth: 0 }}>
					<Text numberOfLines={1} ellipsizeMode="tail" style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
						{title}
					</Text>
					<Text numberOfLines={1} ellipsizeMode="tail" style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
						{data?.artist || data?.source || 'Connecting'}
					</Text>
				</View>
				<IconButton
					label={action.label}
					icon={action.icon}
					loading={playback.isPending}
					disabled={!playable || playback.isPending}
					onPress={() => playback.mutate(undefined)}
				/>
			</View>
			<Notice message={errorMessage(playback.error)} />
		</View>
	)
}
