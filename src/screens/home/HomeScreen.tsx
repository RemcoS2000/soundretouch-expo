import { MaterialIcons } from '@expo/vector-icons'

import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import { AppBackground } from '../../components/AppBackground'
import { useAppSettings } from '../../state/AppSettingsContext'
import { useSoundTouchDevices } from '../../state/SoundTouchDevicesContext'

import { DeviceCarousel } from './components/DeviceCarousel'
import { DeviceControlBottomSheet } from './components/DeviceControlBottomSheet'
import { HomeHeaderCard } from './components/HomeHeaderCard'

const FOOTER_HEIGHT = 84

export default function HomeScreen() {
	const router = useRouter()
	const { devices } = useSoundTouchDevices()
	const { colors } = useAppSettings()

	// Track the currently selected carousel page.
	const [activeIndex, setActiveIndex] = useState(0)
	const [isSheetExpanded, setIsSheetExpanded] = useState(false)

	// Derive the currently active device from activeIndex.
	// Most of the screen (now playing card, overlay content, footer actions) depends on this value.
	const activeDeviceIndex = devices.length === 0 ? 0 : Math.max(0, Math.min(activeIndex, devices.length - 1))
	const activeDevice = devices[activeDeviceIndex]?.device ?? null

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<AppBackground device={activeDevice} />

			{/* Header Section: app title + device manager entry point */}
			<View style={styles.header}>
				<HomeHeaderCard device={activeDevice} isExpanded={isSheetExpanded} />
				<View style={styles.headerActions}>
					<TouchableOpacity onPress={() => router.push('/device-manager')} accessibilityRole="button" accessibilityLabel="Manage devices">
						<View style={styles.iconWrap}>
							<MaterialIcons name="speaker-group" size={24} color={colors.icon} />
						</View>
					</TouchableOpacity>
					<TouchableOpacity onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Open app settings">
						<View style={styles.iconWrap}>
							<MaterialIcons name="settings" size={24} color={colors.icon} />
						</View>
					</TouchableOpacity>
				</View>
			</View>

			{/* Main Content Section: horizontal now-playing carousel + sliding device overlay */}
			<View style={styles.carouselWrap}>
				<DeviceCarousel devices={devices} footerHeight={FOOTER_HEIGHT} onActiveIndexChange={(index) => setActiveIndex(index)} />

				{/* Overlay Section: device controls/settings panel that slides over the carousel */}
				<DeviceControlBottomSheet key={activeDevice?.host ?? 'no-device'} device={activeDevice} onExpandedChange={setIsSheetExpanded} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 60,
		paddingBottom: 0,
		overflow: 'hidden',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		marginBottom: 16,
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
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
