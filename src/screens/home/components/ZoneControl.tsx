import { MaterialIcons } from '@expo/vector-icons'
import type { SoundTouchDevice } from '@soundretouch/api/device'

import React, { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useAppSettings } from '../../../state/AppSettingsContext'
import { useSoundTouchDevices } from '../../../state/SoundTouchDevicesContext'

type ZoneControlProps = {
	/** Base device whose zone/group we are managing. */
	device: SoundTouchDevice
}

export function ZoneControl({ device }: ZoneControlProps) {
	const { devices } = useSoundTouchDevices()
	const { colors } = useAppSettings()
	const availableDevices = useMemo(
		() =>
			devices
				.filter((entry) => entry.device.host !== device.host)
				.map((entry) => ({
					host: entry.device.host,
					name: entry.info?.name ?? 'SoundTouch device',
				})),
		[devices, device.host]
	)

	// TODO: Call SoundTouch zone API to add/remove speakers once available.
	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={[styles.playEverywhereButton, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
				accessibilityLabel="Play everywhere"
				onPress={() => {
					// TODO: Call zone API to group all available speakers.
				}}
			>
				<MaterialIcons name="speaker-group" size={24} color={colors.icon} />
				<Text style={[styles.playEverywhereText, { color: colors.text }]}>Play everywhere</Text>
			</TouchableOpacity>

			<View style={[styles.separator, { backgroundColor: colors.border }]} />

			<Text style={[styles.title, { color: colors.textMuted }]}>Add speakers manually</Text>

			{availableDevices.length > 0 ? (
				<View style={styles.list}>
					{availableDevices.map((item) => (
						<View key={item.host} style={[styles.listRow, { backgroundColor: colors.surfaceMuted }]}>
							<View>
								<Text style={[styles.listName, { color: colors.text }]}>{item.name}</Text>
							</View>
							<TouchableOpacity
								style={styles.addButton}
								accessibilityLabel={`Add ${item.name} to zone`}
								onPress={() => {
									// TODO: Call zone add endpoint for item.host
								}}
							>
								<MaterialIcons name="add" size={18} color="#fff" />
							</TouchableOpacity>
						</View>
					))}
				</View>
			) : (
				<Text style={[styles.helperText, { color: colors.textMuted }]}>No other speakers available.</Text>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		marginTop: 12,
		paddingHorizontal: 2,
	},
	title: {
		marginBottom: 10,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	playEverywhereButton: {
		height: 56,
		borderRadius: 14,
		borderWidth: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
	},
	playEverywhereText: {
		fontSize: 16,
		fontWeight: '700',
	},
	separator: {
		height: 1,
		marginVertical: 14,
	},
	list: {
		gap: 10,
	},
	listRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#f8f9fb',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	listName: {
		fontSize: 14,
		fontWeight: '600',
		color: '#111',
	},
	addButton: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#111',
		alignItems: 'center',
		justifyContent: 'center',
	},
	helperText: {
		marginTop: 10,
		color: '#888',
		fontSize: 12,
	},
})
