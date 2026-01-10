import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';

import type { SoundTouchDevice } from '../services/discovery';

interface SoundtouchDeviceItemProps {
	item: SoundTouchDevice;
	onPress: (item: SoundTouchDevice) => void;
}

// Renders a single SoundTouch device in the list.
export function SoundtouchDeviceItem({ item, onPress }: SoundtouchDeviceItemProps) {
	return (
		<TouchableOpacity onPress={() => onPress(item)} style={[styles.deviceItem, item.disconnected && styles.disconnected]}>
			<Text style={styles.deviceName}>{item.name}</Text>
			{item.model && <Text style={styles.deviceModel}>{item.model}</Text>}
			<Text style={styles.deviceIp}>{item.disconnected ? 'Disconnected' : `IP: ${item.ip}`}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	deviceItem: {
		backgroundColor: '#fff',
		borderRadius: 10,
		padding: 12,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 6,
	},
	disconnected: {
		opacity: 0.5,
	},
	deviceName: {
		fontSize: 16,
		fontWeight: '600',
	},
	deviceModel: {
		color: '#666',
		marginTop: 4,
	},
	deviceIp: {
		color: '#888',
		marginTop: 6,
	},
});
