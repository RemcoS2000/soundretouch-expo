import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { SoundTouchDevice } from '@soundretouch/api/device';
import { useInfo } from '../../../hooks/useInfo';
import { useNowPlaying } from '../../../hooks/useNowPlaying';

type DeviceSummaryCardProps = {
	activeDevice: SoundTouchDevice | null;
	isExpanded: boolean;
	onPress: () => void;
};

export function DeviceSummaryCard({ activeDevice, isExpanded, onPress }: DeviceSummaryCardProps) {
	// Keep card label in sync with the active device info payload.
	const { info } = useInfo(activeDevice);
	const { nowPlaying } = useNowPlaying(activeDevice);
	const isPoweredOff = nowPlaying?.source === 'STANDBY';

	// Sends a POWER key press/release directly to the active speaker.
	const handlePower = useCallback(async () => {
		if (!activeDevice) return;
		try {
			await activeDevice.keyPressAndRelease('POWER');
		} catch {
			// Ignore control failures for now.
		}
	}, [activeDevice]);

	// Footer is hidden when there is no selected device.
	if (!activeDevice) return null;

	const deviceName = info?.name;

	return (
		<TouchableOpacity
			style={styles.footer}
			onPress={onPress}
			activeOpacity={1}
			accessibilityRole="button"
			accessibilityLabel={isExpanded ? 'Collapse speaker details' : 'Open speaker details'}
		>
			{/* Left: device identity */}
			<View style={styles.footerIcon}>
				<MaterialIcons name="speaker" size={18} color="#111" />
			</View>
			<View style={styles.footerText}>
				<Text style={styles.footerTitle}>{deviceName}</Text>
				<Text style={styles.footerSubtitle}>{isExpanded ? 'Tap to collapse details' : 'Tap to open speaker settings'}</Text>
			</View>

			{/* Right: direct power action without toggling overlay state */}
			<TouchableOpacity
				style={[styles.powerButton, isPoweredOff ? styles.powerButtonOff : styles.powerButtonOn]}
				accessibilityLabel="Power"
				onPress={(event) => {
					// Prevent bubbling so only power action runs.
					event.stopPropagation();
					void handlePower();
				}}
			>
				<MaterialIcons name="power-settings-new" size={16} color={isPoweredOff ? '#fff' : '#111'} />
			</TouchableOpacity>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	footer: {
		height: 84,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		paddingHorizontal: 18,
		backgroundColor: '#fff',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	footerIcon: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: '#f3f4f6',
		alignItems: 'center',
		justifyContent: 'center',
	},
	footerText: {
		flex: 1,
	},
	footerTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111',
	},
	footerSubtitle: {
		marginTop: 3,
		fontSize: 12,
		color: '#666',
	},
	powerButton: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	powerButtonOn: {
		backgroundColor: 'transparent',
	},
	powerButtonOff: {
		backgroundColor: '#111',
	},
});
