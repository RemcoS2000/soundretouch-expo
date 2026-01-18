import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Image, type DimensionValue } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { SoundTouchDevice } from '@soundretouch/api/device';
import { useNowPlayingDevice } from '../../hooks/useNowPlayingDevice';
import { NowPlayingHeader } from './NowPlayingHeader';
import { TrackInfo } from './TrackInfo';
import { ProgressBar } from './ProgressBar';
import { TransportControls } from './TransportControls';
import { StandbyCard } from './StandbyCard';

type NowPlayingCardProps = {
	device: SoundTouchDevice;
};

export function NowPlayingCard({ device }: NowPlayingCardProps) {
	const { info, nowPlaying, displayTime } = useNowPlayingDevice(device);

	const deviceName = info?.name ?? 'SoundTouch device';
	const deviceModel = info?.type ?? 'Unknown model';
	const artUrl = nowPlaying?.art?.['#text'] || nowPlaying?.ContentItem?.containerArt;
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
				<NowPlayingHeader source={nowPlaying?.source} />
				{artUrl && <Image source={{ uri: artUrl }} style={styles.artwork} />}
				{nowPlaying?.source === 'STANDBY' ? (
					<StandbyCard />
				) : nowPlaying ? (
					<>
						<TrackInfo title={title} artist={artist} album={album} />
						<ProgressBar progressWidth={progressWidth} />
						<TransportControls isPlaying={isPlaying} onPlayPause={handlePlayPause} />
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
		backgroundColor: '#fff',
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
});
