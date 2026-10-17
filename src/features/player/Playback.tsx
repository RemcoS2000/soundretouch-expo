import type { NowPlaying, SoundTouchDevice } from '@soundretouch/api/device'

import React from 'react'
import { Text, View } from 'react-native'

import { errorMessage, Loading, Notice } from '../../design-system/Screen'
import { useAppSettings } from '../../state/AppSettingsContext'
import { reportAsync } from '../../utils/async'
import { useSpeakerResource } from '../speakers/queries'

import { PlaybackArtwork } from './PlaybackArtwork'
import { PlaybackControls } from './PlaybackControls'
import { artistAlbumLabel, isPlaybackAvailable, trackLabel } from './playbackMetadata'
import { PlaybackTimeline } from './PlaybackTimeline'
import { usePlaybackCommands } from './usePlaybackCommands'
import { usePlaybackProgress } from './usePlaybackProgress'

/** Composes artwork, metadata, progress and controls for the currently displayed speaker. */
export function Playback({ device }: { device: SoundTouchDevice }) {
	const playing = useSpeakerResource(device, 'nowPlaying')
	const { colors } = useAppSettings()
	const data = playing.data
	const progress = usePlaybackProgress(data, playing.dataUpdatedAt)
	const { keys: key, seek } = usePlaybackCommands(device)

	return (
		<>
			<PlaybackArtwork
				url={data?.art?.url}
				style={{ width: '100%', aspectRatio: 1, maxHeight: 420, borderRadius: 28, backgroundColor: colors.artworkFallback }}
				transition={300}
				label="Current album artwork"
			/>
			<View style={{ gap: 8, paddingVertical: 24 }}>
				<Text style={{ color: colors.textMuted, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>{data?.source ?? 'Connecting'}</Text>
				<Text accessibilityRole="header" numberOfLines={1} ellipsizeMode="tail" style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>
					{playbackTitle(data)}
				</Text>
				<Text numberOfLines={1} ellipsizeMode="tail" style={{ color: colors.textMuted, fontSize: 16 }}>
					{artistAlbumLabel(data)}
				</Text>
			</View>
			{playing.isLoading && <Loading />}
			<Notice
				message={playing.isError ? `Showing last known playback. ${errorMessage(playing.error)}` : null}
				retry={() => {
					reportAsync(playing.refetch())
				}}
			/>
			<Notice message={errorMessage(key.error ?? seek.error)} />
			{isPlaybackAvailable(data) && (
				<>
					<PlaybackTimeline data={data} progress={progress} seek={seek} />
					<PlaybackControls data={data} command={key} />
				</>
			)}
		</>
	)
}

/** Describes non-media inputs before falling back to track metadata. */
function playbackTitle(data: NowPlaying | undefined): string {
	if (data?.source === 'STANDBY') {
		return 'Ready when you are'
	}
	if (data?.source === 'AUX') {
		return 'Listening through AUX'
	}

	return trackLabel(data, 'Choose something to play')
}
