import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type NowPlayingHeaderProps = {
	source?: string;
};

export function NowPlayingHeader({ source }: NowPlayingHeaderProps) {
	return (
		<View style={styles.nowPlayingHeader}>
			<Text style={styles.nowPlayingTitle}>Now playing</Text>
			{source && (
				<View style={styles.sourcePill}>
					<Text style={styles.sourceText}>{source}</Text>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
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
});
