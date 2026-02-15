import { MaterialIcons } from '@expo/vector-icons'

import { useRouter } from 'expo-router'
import React, { useMemo, useState } from 'react'
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { AppBackground } from '../../components/AppBackground'
import { AddDeviceManualModal } from '../../modals/AddDeviceManualModal'
import { useSettings } from '../../state/SettingsContext'
import { useSoundTouchDevices } from '../../state/SoundTouchDevicesContext'

export default function DeviceManagerScreen() {
	const [manualVisible, setManualVisible] = useState(false)
	const router = useRouter()
	const { devices, removeDevice } = useSoundTouchDevices()
	const { colors } = useSettings()

	// Normalize device entries for rendering.
	const deviceList = useMemo(
		() =>
			devices.map((entry) => ({
				host: entry.device.host,
				name: entry.info?.name ?? 'SoundTouch device',
			})),
		[devices]
	)

	// Confirm removal; Alert buttons don't work on web.
	const confirmRemove = (host: string, name: string) => {
		if (Platform.OS === 'web') {
			const confirmed = window.confirm(`Remove ${name} from this app?`)
			if (confirmed) {
				removeDevice(host)
			}
			return
		}
		Alert.alert('Remove speaker?', `Remove ${name} from this app?`, [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Remove', style: 'destructive', onPress: () => removeDevice(host) },
		])
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<AppBackground device={null} />
			{/* Fixed header; content scrolls beneath. */}
			<View style={styles.headerRow}>
				<Text style={[styles.headerTitle, { color: colors.text }]}>Devices</Text>
				<TouchableOpacity onPress={() => router.back()}>
					<Text style={[styles.closeText, { color: colors.text }]}>Close</Text>
				</TouchableOpacity>
			</View>
			{/* Device list and actions. */}
			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{deviceList.length > 0 ? (
					<View style={[styles.listCardTop, { backgroundColor: colors.surfaceElevated }]}>
						<Text style={[styles.listTitle, { color: colors.text }]}>Added devices</Text>
						<Text style={[styles.listSubtitle, { color: colors.textMuted }]}>Speakers already linked to this app.</Text>
						{deviceList.map((item) => (
							<View key={item.host} style={[styles.listRow, { backgroundColor: colors.surfaceMuted }]}>
								<View style={styles.listMain}>
									<View style={[styles.deviceIcon, { backgroundColor: colors.surfaceElevated }]}>
										<MaterialIcons name="speaker" size={18} color={colors.icon} />
									</View>
									<View>
										<Text style={[styles.listName, { color: colors.text }]}>{item.name}</Text>
										<Text style={[styles.listHost, { color: colors.textMuted }]}>{item.host}</Text>
									</View>
								</View>
								<TouchableOpacity onPress={() => confirmRemove(item.host, item.name)} accessibilityLabel={`Remove ${item.name}`}>
									<MaterialIcons name="close" size={20} color={colors.textMuted} />
								</TouchableOpacity>
							</View>
						))}
					</View>
				) : (
					<View style={[styles.emptyCardTop, { backgroundColor: colors.surfaceElevated }]}>
						<Text style={[styles.emptyText, { color: colors.textMuted }]}>No devices added yet.</Text>
					</View>
				)}
				<View style={[styles.cardSpaced, { backgroundColor: colors.surfaceElevated }]}>
					<Text style={[styles.title, { color: colors.text }]}>Add a new speaker</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>Add a speaker that is already connected to your local network.</Text>
					<TouchableOpacity style={styles.primaryButton} onPress={() => setManualVisible(true)}>
						<Text style={styles.primaryButtonText}>Add device manually</Text>
					</TouchableOpacity>
				</View>
				<View style={[styles.cardSpaced, { backgroundColor: colors.surfaceElevated }]}>
					<Text style={[styles.title, { color: colors.text }]}>Automatic discovery</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>Scan your local network to find SoundTouch speakers automatically.</Text>
					<TouchableOpacity style={[styles.primaryButton, styles.disabledButton]} disabled>
						<Text style={styles.disabledButtonText}>Not yet implemented</Text>
					</TouchableOpacity>
				</View>
				<View style={[styles.cardSpaced, { backgroundColor: colors.surfaceElevated }]}>
					<Text style={[styles.title, { color: colors.text }]}>Set up a new speaker</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>Connect a speaker that is not yet on your Wi-Fi network.</Text>
					<TouchableOpacity style={[styles.primaryButton, styles.disabledButton]} disabled>
						<Text style={styles.disabledButtonText}>Not yet implemented</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
			<AddDeviceManualModal visible={manualVisible} onClose={() => setManualVisible(false)} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		paddingTop: 60,
	},
	scrollContent: {
		paddingBottom: 30,
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '700',
	},
	closeText: {
		fontWeight: '600',
	},
	cardSpaced: {
		marginTop: 24,
		backgroundColor: '#fff',
		padding: 20,
		borderRadius: 16,
		boxShadow: '0px 8px 16px rgba(0,0,0,0.08)',
	},
	listCardTop: {
		backgroundColor: '#fff',
		padding: 20,
		borderRadius: 16,
		boxShadow: '0px 8px 16px rgba(0,0,0,0.08)',
	},
	listTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 6,
	},
	listSubtitle: {
		marginBottom: 12,
	},
	listRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 12,
		backgroundColor: '#f8f9fb',
		borderRadius: 12,
		marginBottom: 10,
	},
	listMain: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	deviceIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	listName: {
		fontSize: 15,
		fontWeight: '600',
	},
	listHost: {
		marginTop: 4,
	},
	emptyCardTop: {
		padding: 16,
		borderRadius: 16,
		backgroundColor: '#fff',
		boxShadow: '0px 8px 16px rgba(0,0,0,0.08)',
		alignItems: 'center',
	},
	emptyText: {},
	title: {
		fontSize: 18,
		fontWeight: '700',
	},
	subtitle: {
		marginTop: 6,
		marginBottom: 18,
	},
	primaryButton: {
		backgroundColor: '#111',
		borderRadius: 12,
		paddingVertical: 12,
		alignItems: 'center',
	},
	disabledButton: {
		backgroundColor: '#d1d5db',
	},
	primaryButtonText: {
		color: '#fff',
		fontWeight: '600',
	},
	disabledButtonText: {
		color: '#777',
		fontWeight: '600',
	},
})
