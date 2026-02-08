import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, type DimensionValue, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { SoundTouchDevice } from '@soundretouch/api/device';
import { useNowPlaying } from '../../../hooks/useNowPlaying';

type NowPlayingCardProps = {
	device: SoundTouchDevice;
};

export function NowPlayingCard({ device }: NowPlayingCardProps) {
	// Live device state: metadata, playback state, and artwork URL.
	const { nowPlaying, displayTime, artUrl } = useNowPlaying(device);

	// Fallback-safe labels when upstream payload misses fields.
	const title = nowPlaying?.track || nowPlaying?.ContentItem?.itemName || 'Unknown track';
	const artist = nowPlaying?.artist || 'Unknown artist';
	const album = nowPlaying?.album;

	// Use smoothed ticker time when available, otherwise raw device time.
	const displaySeconds = displayTime ?? nowPlaying?.time?.['#text'] ?? 0;
	const totalTime = nowPlaying?.time?.total ?? 0;
	const progress = totalTime ? Math.min(1, displaySeconds / totalTime) : 0;
	const progressWidth = useMemo(() => `${(progress * 100).toFixed(2)}%` as DimensionValue, [progress]);
	const isPlaying = nowPlaying?.playStatus === 'PLAY_STATE';
	const containerStyle = useMemo<ViewStyle[]>(() => [styles.card, styles.cardFull], []);
	const nowPlayingCardStyle = useMemo<ViewStyle[]>(() => [styles.nowPlayingCard, styles.nowPlayingCardFull], []);

	// Transport key actions are delegated to the SoundTouch device API.
	const handlePlayPause = useCallback(async () => {
		try {
			await device.keyPressAndRelease('PLAY_PAUSE');
		} catch {
			// Ignore control failures for now.
		}
	}, [device]);

	const handlePrevious = useCallback(async () => {
		try {
			await device.keyPressAndRelease('PREV_TRACK');
		} catch {
			// Ignore control failures for now.
		}
	}, [device]);

	const handleNext = useCallback(async () => {
		try {
			await device.keyPressAndRelease('NEXT_TRACK');
		} catch {
			// Ignore control failures for now.
		}
	}, [device]);

	return (
		<View style={containerStyle}>
			<View style={nowPlayingCardStyle}>
				{/* Header is hidden in standby mode to keep the state-focused empty view clean. */}
				{nowPlaying?.source !== 'STANDBY' && (
					<View style={styles.nowPlayingHeader}>
						<Text style={styles.nowPlayingTitle}>Now playing</Text>
						{nowPlaying?.source && (
							<View style={styles.sourcePill}>
								<Text style={styles.sourceText}>{nowPlaying.source}</Text>
							</View>
						)}
					</View>
				)}

				{/* Cover art stays visible for active sources and drives the visual focus. */}
				{artUrl && <Image source={{ uri: artUrl }} style={styles.artwork} />}

				{/* Standby has a dedicated stencil-style view. */}
				{nowPlaying?.source === 'STANDBY' ? (
					<View style={styles.standbyCard}>
						<View style={styles.standbyIcon}>
							<MaterialIcons name="speaker" size={28} color="#999" />
						</View>
						<Text style={styles.standbyTitle}>In standby</Text>
						<Text style={styles.standbySubtitle}>Sleeping speaker · zzz</Text>
					</View>
				) : nowPlaying ? (
					// Active playback view: metadata + progress + transport controls.
					<View style={[styles.playbackMeta, styles.playbackMetaBottom]}>
						<Text style={styles.trackTitle}>{title}</Text>
						<Text style={styles.trackMeta}>
							{artist}
							{album ? ` • ${album}` : ''}
						</Text>
						<View style={styles.progressBar}>
							<View style={[styles.progressFill, { width: progressWidth }]} />
						</View>
						<View style={styles.controls}>
							<TouchableOpacity style={styles.controlButton} accessibilityLabel="Previous" onPress={handlePrevious}>
								<MaterialIcons name="skip-previous" size={24} color="#111" />
							</TouchableOpacity>
							<TouchableOpacity style={styles.controlButton} accessibilityLabel="Play or pause" onPress={handlePlayPause}>
								<MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={28} color="#111" />
							</TouchableOpacity>
							<TouchableOpacity style={styles.controlButton} accessibilityLabel="Next" onPress={handleNext}>
								<MaterialIcons name="skip-next" size={24} color="#111" />
							</TouchableOpacity>
						</View>
					</View>
				) : (
					// Fallback when no state has been retrieved yet.
					<Text style={styles.nowPlayingSubtitle}>No track information yet.</Text>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {},
	cardFull: {
		flex: 1,
		padding: 20,
		borderRadius: 24,
	},
	nowPlayingCard: {
		flex: 1,
		padding: 0,
		borderRadius: 12,
		position: 'relative',
	},
	nowPlayingCardFull: {
		paddingBottom: 164,
	},
	playbackMeta: {
		marginTop: 12,
	},
	playbackMetaBottom: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 8,
	},
	nowPlayingHeader: {
		paddingHorizontal: 16,
		paddingTop: 14,
		paddingBottom: 8,
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
	nowPlayingSubtitle: {
		color: '#444',
		paddingHorizontal: 16,
		paddingVertical: 14,
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
		color: '#111',
		paddingHorizontal: 16,
		paddingTop: 12,
		textAlign: 'center',
	},
	trackMeta: {
		marginTop: 4,
		color: '#666',
		paddingHorizontal: 16,
		textAlign: 'center',
	},
	progressBar: {
		marginTop: 12,
		marginHorizontal: 16,
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
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingHorizontal: 16,
	},
	controlButton: {
		width: 44,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
	},
	standbyCard: {
		marginTop: 10,
		alignItems: 'center',
		paddingVertical: 16,
		backgroundColor: '#f4f5f7',
		borderRadius: 12,
	},
	standbyIcon: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
	},
	standbyTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#555',
	},
	standbySubtitle: {
		marginTop: 4,
		color: '#888',
	},
});
