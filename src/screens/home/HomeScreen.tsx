import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSoundTouchDevices } from '../../state/SoundTouchDevicesContext';
import { HomeBackground } from './components/HomeBackground';
import { DeviceCarousel } from './components/DeviceCarousel';
import { DeviceControlOverlay } from './components/DeviceControlOverlay';

const FOOTER_HEIGHT = 84;
const FOOTER_EXPANDED_TOP_OFFSET = 20;

export default function HomeScreen() {
	const router = useRouter();
	const { devices } = useSoundTouchDevices();

	// Track the currently selected carousel page.
	const [activeIndex, setActiveIndex] = useState(0);

	// Derive the currently active device from activeIndex.
	// Most of the screen (now playing card, overlay content, footer actions) depends on this value.
	const activeDeviceIndex = devices.length === 0 ? 0 : Math.max(0, Math.min(activeIndex, devices.length - 1));
	const activeDevice = devices[activeDeviceIndex]?.device ?? null;
	const { height: screenHeight } = useWindowDimensions();

	return (
		<View style={styles.container}>
			<HomeBackground device={activeDevice} />

			{/* Header Section: app title + device manager entry point */}
			<View style={styles.header}>
				<Text style={styles.title}>SoundReTouch</Text>
				<TouchableOpacity
					onPress={() => router.push('/device-manager')}
					accessibilityRole="button"
					accessibilityLabel="Manage devices"
				>
					<View style={styles.iconWrap}>
						<MaterialIcons name="speaker-group" size={24} color="black" />
						<MaterialIcons name="add-circle" size={14} color="#111" style={styles.iconBadge} />
					</View>
				</TouchableOpacity>
			</View>

			{/* Main Content Section: horizontal now-playing carousel + sliding device overlay */}
			<View style={styles.carouselWrap}>
				<DeviceCarousel devices={devices} footerHeight={FOOTER_HEIGHT} onActiveIndexChange={(index) => setActiveIndex(index)} />

				{/* Overlay Section: device controls/settings panel that slides over the carousel */}
				<DeviceControlOverlay
					key={activeDevice?.host ?? 'no-device'}
					device={activeDevice}
					footerHeight={FOOTER_HEIGHT}
					screenHeight={screenHeight}
					expandedTopOffset={FOOTER_EXPANDED_TOP_OFFSET}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 60,
		paddingBottom: 0,
		backgroundColor: '#f3f4f6',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		marginBottom: 16,
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
	},
	iconWrap: {
		width: 26,
		height: 26,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconBadge: {
		position: 'absolute',
		right: -2,
		bottom: -2,
		backgroundColor: 'rgba(255,255,255,1)',
		opacity: 1,
		borderRadius: 8,
	},
	carouselWrap: {
		flex: 1,
		paddingBottom: 0,
		position: 'relative',
	},
});
