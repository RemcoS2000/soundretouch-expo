import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Displays a message when no SoundTouch devices are found.
export function EmptyDeviceList() {
	return (
		<View style={styles.emptyMessage}>
			<Text style={styles.emptyText}>No SoundTouch devices found.</Text>
			<Text style={styles.emptyText}>Make sure you&apos;re on the same Wi-Fi.</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	emptyMessage: {
		alignItems: 'center',
		marginTop: 60,
	},
	emptyText: {
		color: '#999',
		marginTop: 8,
		textAlign: 'center',
	},
});
