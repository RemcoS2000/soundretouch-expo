import React from 'react';
import { Text, StyleSheet } from 'react-native';

type TrackInfoProps = {
	title: string;
	artist: string;
	album?: string;
};

export function TrackInfo({ title, artist, album }: TrackInfoProps) {
	return (
		<>
			<Text style={styles.trackTitle}>{title}</Text>
			<Text style={styles.trackMeta}>
				{artist}
				{album ? ` • ${album}` : ''}
			</Text>
		</>
	);
}

const styles = StyleSheet.create({
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
});
