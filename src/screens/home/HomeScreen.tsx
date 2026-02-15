import { MaterialIcons } from '@expo/vector-icons'

import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useSoundTouchDevices } from '../../state/SoundTouchDevicesContext'

import { DeviceCarousel } from './components/DeviceCarousel'
import { DeviceControlBottomSheet } from './components/DeviceControlBottomSheet'
import { HomeBackground } from './components/HomeBackground'

const FOOTER_HEIGHT = 84

export default function HomeScreen() {
	const router = useRouter()
	const { devices } = useSoundTouchDevices()

	// Track the currently selected carousel page.
	const [activeIndex, setActiveIndex] = useState(0)

	// Derive the currently active device from activeIndex.
	// Most of the screen (now playing card, overlay content, footer actions) depends on this value.
	const activeDeviceIndex = devices.length === 0 ? 0 : Math.max(0, Math.min(activeIndex, devices.length - 1))
	const activeDevice = devices[activeDeviceIndex]?.device ?? null

	return (
		<View style={styles.container}>
			<HomeBackground device={activeDevice} />

			{/* Header Section: app title + device manager entry point */}
			<View style={styles.header}>
				<Text style={styles.title}>SoundReTouch</Text>
				<TouchableOpacity onPress={() => router.push('/device-manager')} accessibilityRole="button" accessibilityLabel="Manage devices">
					<View style={styles.iconWrap}>
						<MaterialIcons name="settings" size={24} color="black" />
					</View>
				</TouchableOpacity>
			</View>

			{/* Main Content Section: horizontal now-playing carousel + sliding device overlay */}
			<View style={styles.carouselWrap}>
				<DeviceCarousel devices={devices} footerHeight={FOOTER_HEIGHT} onActiveIndexChange={(index) => setActiveIndex(index)} />

				{/* Overlay Section: device controls/settings panel that slides over the carousel */}
				<DeviceControlBottomSheet key={activeDevice?.host ?? 'no-device'} device={activeDevice} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 60,
		paddingBottom: 0,
		backgroundColor: '#f3f4f6',
		overflow: 'hidden',
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
		borderRadius: 13,
	},
	carouselWrap: {
		flex: 1,
		paddingBottom: 0,
		position: 'relative',
	},
})
