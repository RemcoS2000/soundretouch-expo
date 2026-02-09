import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, type DimensionValue } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { SoundTouchDevice } from '@soundretouch/api/device';
import { useNowPlaying } from '../../../hooks/useNowPlaying';

type NowPlayingCardProps = {
	/** Device instance used for now-playing polling/subscription and media key actions. */
	device: SoundTouchDevice;
};

export function NowPlayingCard({ device }: NowPlayingCardProps) {
	// Live device state: metadata, playback state, and artwork URL.
	const { nowPlaying, artUrl } = useNowPlaying(device);

	// Extract nowPlaying details
	const title = nowPlaying?.track || nowPlaying?.ContentItem?.itemName || '';
	const artist = nowPlaying?.artist || '';
	const album = nowPlaying?.album;
	const source = nowPlaying?.source ?? null;
	const shuffleSetting = nowPlaying?.shuffleSetting ?? '';
	const repeatSetting = nowPlaying?.repeatSetting ?? '';
	const isStandby = source === 'STANDBY';

	// Derive common state booleans for visual and interaction logic.
	const hasNowPlaying = Boolean(nowPlaying);
	const isPlaying = nowPlaying?.playStatus === 'PLAY_STATE';
	const isShuffleOn = shuffleSetting === 'SHUFFLE_ON';
	const isRepeatOn = repeatSetting === 'REPEAT_ALL' || repeatSetting === 'REPEAT_ONE';
	const repeatIconName = repeatSetting === 'REPEAT_ONE' ? 'repeat-one' : 'repeat';
	const nextRepeatKey = repeatSetting === 'REPEAT_OFF' ? 'REPEAT_ALL' : repeatSetting === 'REPEAT_ALL' ? 'REPEAT_ONE' : 'REPEAT_OFF';
	const repeatA11yLabel =
		repeatSetting === 'REPEAT_OFF' ? 'Enable repeat all' : repeatSetting === 'REPEAT_ALL' ? 'Switch to repeat one' : 'Disable repeat';

	// Use raw device-provided playback time.
	const displaySeconds = nowPlaying?.time?.['#text'] ?? 0;
	const totalTime = nowPlaying?.time?.total ?? 0;
	const progress = totalTime ? Math.min(1, displaySeconds / totalTime) : 0;
	const progressWidth = `${(progress * 100).toFixed(2)}%` as DimensionValue;

	// Transport key actions are delegated to the SoundTouch device API.
	const sendKey = useCallback(
		async (key: 'PLAY_PAUSE' | 'PREV_TRACK' | 'NEXT_TRACK' | 'SHUFFLE_ON' | 'SHUFFLE_OFF' | 'REPEAT_ALL' | 'REPEAT_OFF') => {
			try {
				await device.keyPressAndRelease(key);
			} catch {
				// Ignore control failures for now.
			}
		},
		[device]
	);

	return (
		<View style={styles.cardFull}>
			<View style={styles.nowPlayingCard}>
				{/* Header stays visible in standby so source state is still clear to the user. */}
				<View style={styles.nowPlayingHeader}>
					<Text style={styles.nowPlayingTitle}>Now playing</Text>
					{source && (
						<View style={styles.sourcePill}>
							<Text style={styles.sourceText}>{source}</Text>
						</View>
					)}
				</View>

				{/* Hide playback content in standby, but keep the source pill in the header. */}
				{!isStandby && artUrl ? <Image source={{ uri: artUrl }} style={styles.artwork} /> : null}

				{!isStandby && hasNowPlaying ? (
					// Active playback view: metadata + progress + transport controls.
					<View style={styles.playbackMeta}>
						{title ? (
							<Text style={styles.trackTitle} numberOfLines={1} ellipsizeMode="tail">
								{title}
							</Text>
						) : null}
						{artist || album ? (
							<Text style={styles.trackMeta} numberOfLines={1} ellipsizeMode="tail">
								{artist}
								{album ? ` • ${album}` : ''}
							</Text>
						) : null}
						<View style={styles.progressBar}>
							<View style={[styles.progressFill, { width: progressWidth }]} />
						</View>
						<View style={styles.controls}>
							<TouchableOpacity
								style={styles.controlButton}
								accessibilityLabel={isShuffleOn ? 'Disable shuffle' : 'Enable shuffle'}
								onPress={() => void sendKey(isShuffleOn ? 'SHUFFLE_OFF' : 'SHUFFLE_ON')}
							>
								<View style={styles.modeButtonContent}>
									<MaterialIcons name="shuffle" size={24} color={isShuffleOn ? '#111' : '#666'} />
									{isShuffleOn ? <View style={styles.modeActiveDot} /> : <View style={styles.modeActiveDotSpacer} />}
								</View>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.controlButton}
								accessibilityLabel="Previous"
								onPress={() => void sendKey('PREV_TRACK')}
							>
								<MaterialIcons name="skip-previous" size={24} color="#111" />
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.controlButton}
								accessibilityLabel="Play or pause"
								onPress={() => void sendKey('PLAY_PAUSE')}
							>
								<MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={28} color="#111" />
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.controlButton}
								accessibilityLabel="Next"
								onPress={() => void sendKey('NEXT_TRACK')}
							>
								<View style={styles.modeButtonContent}>
									<MaterialIcons name="skip-next" size={24} color="#111" />
									<View style={styles.modeActiveDotSpacer} />
								</View>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.controlButton}
								accessibilityLabel={repeatA11yLabel}
								onPress={() => void sendKey(nextRepeatKey)}
							>
								<View style={styles.modeButtonContent}>
									<MaterialIcons
										name={repeatIconName}
										size={24}
										color={isRepeatOn ? '#111' : '#666'}
										style={styles.modeIcon}
									/>
									{isRepeatOn ? <View style={styles.modeActiveDot} /> : <View style={styles.modeActiveDotSpacer} />}
								</View>
							</TouchableOpacity>
						</View>
					</View>
				) : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	cardFull: {
		flex: 1,
		borderRadius: 24,
	},
	nowPlayingCard: {
		flex: 1,
		padding: 0,
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
		color: '#666',
		textAlign: 'center',
	},
	sourcePill: {
		backgroundColor: '#111',
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
		backgroundColor: '#e5e7eb',
	},
	trackTitle: {
		fontSize: 16,
		fontWeight: '700',
		lineHeight: 22,
		color: '#111',
		paddingTop: 0,
		textAlign: 'left',
	},
	trackMeta: {
		marginTop: 4,
		lineHeight: 18,
		color: '#666',
		textAlign: 'left',
	},
	progressBar: {
		marginTop: 12,
		height: 6,
		borderRadius: 999,
		backgroundColor: '#e5e7eb',
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		width: '0%',
		backgroundColor: '#111',
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
	modeActiveDot: {
		marginTop: 2,
		width: 4,
		height: 4,
		borderRadius: 2,
		backgroundColor: '#111',
	},
	modeActiveDotSpacer: {
		marginTop: 2,
		width: 4,
		height: 4,
		opacity: 0,
	},
});
