import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, type DimensionValue } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { SoundTouchDevice } from '@soundretouch/api/device';
import { useNowPlayingDevice } from '../../hooks/useNowPlayingDevice';
import { useColorTint } from '../../hooks/useColorTint';

type NowPlayingCardProps = {
	device: SoundTouchDevice;
};

export function NowPlayingCard({ device }: NowPlayingCardProps) {
	const { info, nowPlaying, displayTime, artUrl } = useNowPlayingDevice(device);
	const { darkTint } = useColorTint(device);

	const deviceName = info?.name ?? 'SoundTouch device';
	const deviceModel = info?.type ?? 'Unknown model';
	const title = nowPlaying?.track || nowPlaying?.ContentItem?.itemName || 'Unknown track';
	const artist = nowPlaying?.artist || 'Unknown artist';
	const album = nowPlaying?.album;

	const displaySeconds = displayTime ?? nowPlaying?.time?.['#text'] ?? 0;
	const totalTime = nowPlaying?.time?.total ?? 0;
	const progress = totalTime ? Math.min(1, displaySeconds / totalTime) : 0;
	const progressWidth = useMemo(() => `${(progress * 100).toFixed(2)}%` as DimensionValue, [progress]);
	const isPlaying = nowPlaying?.playStatus === 'PLAY_STATE';

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

	const handlePower = useCallback(async () => {
		try {
			await device.keyPressAndRelease('POWER');
		} catch {
			// Ignore control failures for now.
		}
	}, [device]);

	return (
		<View style={styles.card}>
			<View style={styles.deviceHeader}>
				<MaterialIcons name="speaker" size={22} color="#111" style={styles.deviceIcon} />
				<View>
					<Text style={styles.title}>{deviceName}</Text>
					<Text style={styles.subtitle}>{deviceModel}</Text>
				</View>
				<TouchableOpacity
					style={[styles.powerButton, { backgroundColor: darkTint }]}
					accessibilityLabel="Power"
					onPress={handlePower}
				>
					<MaterialIcons name="power-settings-new" size={16} color="#fff" />
				</TouchableOpacity>
			</View>
			<View style={styles.nowPlayingCard}>
				{nowPlaying?.source !== 'STANDBY' && (
					<View style={styles.nowPlayingHeader}>
						<Text style={styles.nowPlayingTitle}>Now playing</Text>
						{nowPlaying?.source && (
							<View style={[styles.sourcePill, { backgroundColor: darkTint }]}>
								<Text style={styles.sourceText}>{nowPlaying.source}</Text>
							</View>
						)}
					</View>
				)}
				{artUrl && <Image source={{ uri: artUrl }} style={styles.artwork} />}
				{nowPlaying?.source === 'STANDBY' ? (
					<View style={styles.standbyCard}>
						<View style={styles.standbyIcon}>
							<MaterialIcons name="speaker" size={28} color="#999" />
						</View>
						<Text style={styles.standbyTitle}>In standby</Text>
						<Text style={styles.standbySubtitle}>Sleeping speaker · zzz</Text>
					</View>
				) : nowPlaying ? (
					<>
						<Text style={styles.trackTitle}>{title}</Text>
						<Text style={styles.trackMeta}>
							{artist}
							{album ? ` • ${album}` : ''}
						</Text>
						<View style={styles.progressBar}>
							<View style={[styles.progressFill, { width: progressWidth, backgroundColor: darkTint }]} />
						</View>
						<View style={styles.controls}>
							<TouchableOpacity
								style={[styles.controlButton, { backgroundColor: darkTint }]}
								accessibilityLabel="Previous"
								onPress={handlePrevious}
							>
								<MaterialIcons name="skip-previous" size={24} color="#fff" />
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.controlButton, { backgroundColor: darkTint }]}
								accessibilityLabel="Play or pause"
								onPress={handlePlayPause}
							>
								<MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={28} color="#fff" />
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.controlButton, { backgroundColor: darkTint }]}
								accessibilityLabel="Next"
								onPress={handleNext}
							>
								<MaterialIcons name="skip-next" size={24} color="#fff" />
							</TouchableOpacity>
						</View>
					</>
				) : (
					<Text style={styles.nowPlayingSubtitle}>No track information yet.</Text>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: 18,
		borderRadius: 18,
		backgroundColor: '#fff',
		boxShadow: '0px 8px 18px rgba(0,0,0,0.08)',
	},
	deviceHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	deviceIcon: {
		marginTop: 2,
	},
	title: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111',
	},
	subtitle: {
		marginTop: 4,
		color: '#666',
	},
	nowPlayingCard: {
		marginTop: 16,
		padding: 0,
		borderRadius: 12,
		position: 'relative',
	},
	powerButton: {
		position: 'absolute',
		top: 10,
		right: 10,
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: '#111',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 1,
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
		borderRadius: 22,
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
