import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type TransportControlsProps = {
	isPlaying: boolean;
	onPlayPause: () => void;
};

export function TransportControls({ isPlaying, onPlayPause }: TransportControlsProps) {
	return (
		<View style={styles.controls}>
			<TouchableOpacity style={[styles.controlButton, styles.controlButtonDark]} accessibilityLabel="Previous">
				<MaterialIcons name="skip-previous" size={24} color="#fff" />
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.controlButton, styles.controlButtonDark]}
				accessibilityLabel="Play or pause"
				onPress={onPlayPause}
			>
				<MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={28} color="#fff" />
			</TouchableOpacity>
			<TouchableOpacity style={[styles.controlButton, styles.controlButtonDark]} accessibilityLabel="Next">
				<MaterialIcons name="skip-next" size={24} color="#fff" />
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
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
	controlButtonDark: {
		backgroundColor: '#111',
	},
});
