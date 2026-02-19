import { MaterialIcons } from '@expo/vector-icons'
import type { SoundTouchDevice } from '@soundretouch/api/device'

import React, { useCallback } from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useNowPlaying } from '../../../hooks/useNowPlaying'
import { useAppSettings } from '../../../state/AppSettingsContext'
import { getSourceIconName } from '../../../utils'

type NowPlayingCardProps = {
	/** Device instance used for now-playing polling/subscription and media key actions. */
	device: SoundTouchDevice
}

export function NowPlayingCard({ device }: NowPlayingCardProps) {
	// Live device state: metadata, playback state, and artwork URL.
	const { nowPlaying, nowPlayingProgress } = useNowPlaying(device)
	const { colors } = useAppSettings()

	// Extract nowPlaying details
	const title = nowPlaying?.track || nowPlaying?.ContentItem?.itemName || ''
	const artist = nowPlaying?.artist || ''
	const album = nowPlaying?.album
	const source = nowPlaying?.source ?? null
	const artUrl = nowPlaying?.art?.url
	const shuffleSetting = nowPlaying?.shuffleSetting ?? ''
	const repeatSetting = nowPlaying?.repeatSetting ?? ''

	// Derive common state booleans for visual and interaction logic.
	const hasNowPlaying = Boolean(nowPlaying)
	const isPlaying = nowPlaying?.playStatus === 'PLAY_STATE'
	const isShuffleOn = shuffleSetting === 'SHUFFLE_ON'
	const isRepeatOn = repeatSetting === 'REPEAT_ALL' || repeatSetting === 'REPEAT_ONE'
	const isStandby = source === 'STANDBY'
	const isInvalidSource = source === 'INVALID_SOURCE'
	const isAux = source === 'AUX'
	const hidePlaybackContent = isStandby || isInvalidSource || isAux

	const repeatIconName = repeatSetting === 'REPEAT_ONE' ? 'repeat-one' : 'repeat'
	const nextRepeatKey = repeatSetting === 'REPEAT_OFF' ? 'REPEAT_ALL' : repeatSetting === 'REPEAT_ALL' ? 'REPEAT_ONE' : 'REPEAT_OFF'
	const repeatA11yLabel = repeatSetting === 'REPEAT_OFF' ? 'Enable repeat all' : repeatSetting === 'REPEAT_ALL' ? 'Switch to repeat one' : 'Disable repeat'

	// Interpolated progress from hook.
	const { progressWidth } = nowPlayingProgress

	// Transport key actions are delegated to the SoundTouch device API.
	const sendKey = useCallback(
		async (key: 'PLAY_PAUSE' | 'PREV_TRACK' | 'NEXT_TRACK' | 'SHUFFLE_ON' | 'SHUFFLE_OFF' | 'REPEAT_ALL' | 'REPEAT_ONE' | 'REPEAT_OFF') => {
			try {
				await device.keyPressAndRelease(key)
			} catch {
				// Ignore control failures for now.
			}
		},
		[device]
	)

	const showArtwork = !hidePlaybackContent && Boolean(artUrl)
	const showPlayback = !hidePlaybackContent && hasNowPlaying
	const primaryColor = colors.text
	const mutedColor = colors.mutedStrong
	const statusMessage = isInvalidSource
		? {
				title: 'No source selected',
				subtitle: 'Select a source to start listening.',
			}
		: isStandby
			? {
					title: 'Device is stand by',
					subtitle: 'Use the power button below to turn it on.',
				}
			: null

	return (
		<>
			<View style={styles.cardFull}>
				<View style={styles.nowPlayingCard}>
					<View style={styles.nowPlayingHeader}>
						<Text style={[styles.nowPlayingTitle, { color: colors.textMuted }]}>Now playing</Text>
						{source ? (
							<View style={[styles.sourcePill, { backgroundColor: colors.pill }]}>
								<Text style={styles.sourceText}>{source}</Text>
							</View>
						) : null}
					</View>

					{showPlayback ? (
						<View style={styles.artworkFrame}>
							{showArtwork ? <Image source={{ uri: artUrl }} style={[styles.artwork, { backgroundColor: colors.artworkFallback }]} /> : null}
							{!showArtwork ? (
								<View style={[styles.artwork, styles.artworkPlaceholder, { backgroundColor: colors.artworkFallback }]}>
									<MaterialIcons name={getSourceIconName(source ?? undefined)} size={56} color={colors.icon} />
								</View>
							) : null}
						</View>
					) : null}

					{showPlayback ? (
						<View style={styles.playbackMeta}>
							{title ? (
								<Text style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
									{title}
								</Text>
							) : null}
							{artist || album ? (
								<Text style={[styles.trackMeta, { color: colors.textMuted }]} numberOfLines={1} ellipsizeMode="tail">
									{artist}
									{album ? ` • ${album}` : ''}
								</Text>
							) : null}
							<View style={[styles.progressBar, { backgroundColor: colors.progressTrack }]}>
								<View style={[styles.progressFill, { backgroundColor: colors.progressFill, width: progressWidth }]} />
							</View>
							<View style={styles.controls}>
								<TouchableOpacity
									style={styles.controlButton}
									accessibilityLabel={isShuffleOn ? 'Disable shuffle' : 'Enable shuffle'}
									onPress={() => void sendKey(isShuffleOn ? 'SHUFFLE_OFF' : 'SHUFFLE_ON')}
								>
									<View style={styles.modeButtonContent}>
										<MaterialIcons name="shuffle" size={24} color={isShuffleOn ? primaryColor : mutedColor} />
										{isShuffleOn ? (
											<View style={[styles.modeActiveDot, { backgroundColor: colors.progressFill }]} />
										) : (
											<View style={styles.modeActiveDotSpacer} />
										)}
									</View>
								</TouchableOpacity>
								<TouchableOpacity style={styles.controlButton} accessibilityLabel="Previous" onPress={() => void sendKey('PREV_TRACK')}>
									<MaterialIcons name="skip-previous" size={24} color={primaryColor} />
								</TouchableOpacity>
								<TouchableOpacity style={styles.controlButton} accessibilityLabel="Play or pause" onPress={() => void sendKey('PLAY_PAUSE')}>
									<MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={28} color={primaryColor} />
								</TouchableOpacity>
								<TouchableOpacity style={styles.controlButton} accessibilityLabel="Next" onPress={() => void sendKey('NEXT_TRACK')}>
									<View style={styles.modeButtonContent}>
										<MaterialIcons name="skip-next" size={24} color={primaryColor} />
										<View style={styles.modeActiveDotSpacer} />
									</View>
								</TouchableOpacity>
								<TouchableOpacity style={styles.controlButton} accessibilityLabel={repeatA11yLabel} onPress={() => void sendKey(nextRepeatKey)}>
									<View style={styles.modeButtonContent}>
										<MaterialIcons name={repeatIconName} size={24} color={isRepeatOn ? primaryColor : mutedColor} style={styles.modeIcon} />
										{isRepeatOn ? (
											<View style={[styles.modeActiveDot, { backgroundColor: colors.progressFill }]} />
										) : (
											<View style={styles.modeActiveDotSpacer} />
										)}
									</View>
								</TouchableOpacity>
							</View>
						</View>
					) : null}
				</View>
			</View>
			{statusMessage ? (
				<View style={[styles.statusCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
					<Text style={[styles.statusTitle, { color: colors.text }]}>{statusMessage.title}</Text>
					<Text style={[styles.statusSubtitle, { color: colors.textMuted }]}>{statusMessage.subtitle}</Text>
				</View>
			) : null}
		</>
	)
}

const styles = StyleSheet.create({
	cardFull: {
		flex: 1,
	},
	nowPlayingCard: {
		flex: 1,
		borderRadius: 12,
		position: 'relative',
	},
	playbackMeta: {
		marginTop: 8,
		padding: 5,
	},
	nowPlayingHeader: {
		paddingTop: 14,
		paddingBottom: 8,
		paddingHorizontal: 5,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	nowPlayingTitle: {
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
		textAlign: 'center',
	},
	sourcePill: {
		borderRadius: 10,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	sourceText: {
		color: '#fff',
		fontSize: 10,
		fontWeight: '600',
	},
	artwork: {
		width: '100%',
		aspectRatio: 1,
		borderRadius: 12,
	},
	artworkFrame: {
		position: 'relative',
	},
	artworkPlaceholder: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	trackTitle: {
		fontSize: 16,
		fontWeight: '700',
		lineHeight: 22,
		paddingTop: 0,
		textAlign: 'left',
	},
	trackMeta: {
		marginTop: 4,
		lineHeight: 18,
		textAlign: 'left',
	},
	progressBar: {
		marginTop: 12,
		height: 6,
		borderRadius: 999,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		width: '0%',
	},
	controls: {
		marginTop: 12,
		marginBottom: 14,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		paddingHorizontal: 8,
	},
	controlButton: {
		width: 44,
		height: 48,
		alignItems: 'center',
		justifyContent: 'flex-start',
	},
	modeButtonContent: {
		alignItems: 'center',
		justifyContent: 'flex-start',
		height: 30,
	},
	modeIcon: {
		marginTop: 1,
	},
	modeActiveDot: {
		marginTop: 2,
		width: 4,
		height: 4,
		borderRadius: 2,
	},
	modeActiveDotSpacer: {
		marginTop: 2,
		width: 4,
		height: 4,
		opacity: 0,
	},
	statusCard: {
		marginTop: 12,
		marginBottom: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderRadius: 14,
		borderWidth: 1,
	},
	statusTitle: {
		fontSize: 15,
		fontWeight: '600',
	},
	statusSubtitle: {
		marginTop: 4,
		fontSize: 13,
	},
})
