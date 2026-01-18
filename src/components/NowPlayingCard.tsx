import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { DeviceInfo, NowPlaying, SoundTouchDevice } from '@soundretouch/api/device';

type NowPlayingCardProps = {
	device: SoundTouchDevice;
};

export function NowPlayingCard({ device }: NowPlayingCardProps) {
	const [info, setInfo] = useState<DeviceInfo | null>(null);
	const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);

	const progress = nowPlaying?.time?.total ? Math.min(1, (nowPlaying.time['#text'] ?? 0) / nowPlaying.time.total) : 0;
	const deviceName = info?.name ?? 'SoundTouch device';
	const deviceModel = info?.type ?? 'Unknown model';
	const artUrl = nowPlaying?.art?.['#text'] || nowPlaying?.ContentItem?.containerArt;
	const title = nowPlaying?.track || nowPlaying?.ContentItem?.itemName || 'Unknown track';
	const artist = nowPlaying?.artist || 'Unknown artist';
	const album = nowPlaying?.album;

	useEffect(() => {
		let active = true;
		const unsub = device.onNowPlayingUpdated((data) => {
			if (!active) return;
			setNowPlaying(data);
		});

		device
			.info()
			.then((data) => {
				if (active) setInfo(data);
			})
			.catch(() => undefined);

		device
			.nowPlaying()
			.then((data) => {
				if (active) setNowPlaying(data);
			})
			.catch(() => {
				if (active) setNowPlaying(null);
			});

		return () => {
			active = false;
			unsub();
		};
	}, [device]);

	const handlePlayPause = useCallback(async () => {
		try {
			await device.keyPressAndRelease('PLAY_PAUSE');
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
			</View>
			<View style={styles.nowPlayingCard}>
				<View style={styles.nowPlayingHeader}>
					<Text style={styles.nowPlayingTitle}>Now playing</Text>
					{nowPlaying?.source && (
						<View style={styles.sourcePill}>
							<Text style={styles.sourceText}>{nowPlaying.source}</Text>
						</View>
					)}
				</View>
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
							<View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
						</View>
						<View style={styles.controls}>
							<TouchableOpacity style={[styles.controlButton, styles.controlButtonDark]} accessibilityLabel="Previous">
								<MaterialIcons name="skip-previous" size={24} color="#fff" />
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.controlButton, styles.controlButtonDark]}
								accessibilityLabel="Play or pause"
								onPress={handlePlayPause}
							>
								<MaterialIcons
									name={nowPlaying.playStatus === 'PLAY_STATE' ? 'pause' : 'play-arrow'}
									size={28}
									color="#fff"
								/>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.controlButton, styles.controlButtonDark]} accessibilityLabel="Next">
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
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 10,
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
		backgroundColor: '#fff',
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
	controlButtonLight: {
		backgroundColor: '#fff',
	},
	controlButtonDark: {
		backgroundColor: '#111',
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
