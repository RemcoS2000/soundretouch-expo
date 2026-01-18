import React from 'react';
import { View, StyleSheet, type DimensionValue } from 'react-native';

type ProgressBarProps = {
	progressWidth: DimensionValue;
};

export function ProgressBar({ progressWidth }: ProgressBarProps) {
	return (
		<View style={styles.progressBar}>
			<View style={[styles.progressFill, { width: progressWidth }]} />
		</View>
	);
}

const styles = StyleSheet.create({
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
});
