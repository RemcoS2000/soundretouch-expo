import { MaterialIcons } from '@expo/vector-icons'
import type { SoundTouchDevice } from '@soundretouch/api/device'

import React, { useCallback } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useInfo } from '../../../hooks/useInfo'
import { useNowPlaying } from '../../../hooks/useNowPlaying'
import { useZone } from '../../../hooks/useZone'
import { useAppSettings } from '../../../state/AppSettingsContext'

type DeviceSummaryProps = {
	/** Device shown in the summary row. When `null`, the card renders nothing. */
	device: SoundTouchDevice | null
	/** Expansion state for subtitle/accessibility text; visual layout stays the same. */
	isExpanded: boolean
	/** Primary press action, usually toggles the bottom sheet open/closed. */
	onPress: () => void
}

export function DeviceSummary({ device, isExpanded, onPress }: DeviceSummaryProps) {
	// Keep card label in sync with the active device info payload.
	const { info } = useInfo(device)
	const { nowPlaying } = useNowPlaying(device)
	const { isInZone, isZoneMaster } = useZone(device)
	const { colors } = useAppSettings()
	const isPoweredOff = nowPlaying?.source === 'STANDBY'
	const summaryIconName = isZoneMaster && isInZone ? 'speaker-group' : 'speaker'
	const collapsedSubtitle = isZoneMaster && isInZone ? 'Tap to open speaker group settings' : 'Tap to open speaker settings'

	// Sends a POWER key press/release directly to the active speaker.
	const handlePower = useCallback(async () => {
		if (!device) return
		try {
			await device.keyPressAndRelease('POWER')
		} catch {
			// Ignore control failures for now.
		}
	}, [device])

	// Footer is hidden when there is no selected device.
	if (!device) return null

	const deviceName = info?.name

	return (
		<TouchableOpacity
			style={[styles.footer, { backgroundColor: colors.surfaceElevated }]}
			onPress={onPress}
			activeOpacity={1}
			accessibilityRole="button"
			accessibilityLabel={isExpanded ? 'Collapse speaker details' : 'Open speaker details'}
		>
			{/* Left: device identity */}
			<View style={[styles.footerIcon, { backgroundColor: colors.surface }]}>
				<MaterialIcons name={summaryIconName} size={18} color={colors.icon} />
			</View>
			<View style={styles.footerText}>
				<Text style={[styles.footerTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
					{deviceName}
				</Text>
				<Text style={[styles.footerSubtitle, { color: colors.textMuted }]}>{isExpanded ? 'Tap to collapse details' : collapsedSubtitle}</Text>
			</View>

			<View style={styles.rightActions}>
				{/* Right: direct power action without toggling overlay state */}
				<TouchableOpacity
					style={[styles.powerButton, isPoweredOff ? styles.powerButtonOff : styles.powerButtonOn]}
					accessibilityLabel="Power"
					onPress={(event) => {
						// Prevent bubbling so only power action runs.
						event.stopPropagation()
						void handlePower()
					}}
				>
					<MaterialIcons name="power-settings-new" size={16} color={isPoweredOff ? '#fff' : colors.icon} />
				</TouchableOpacity>
			</View>
		</TouchableOpacity>
	)
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
	},
	footerSubtitle: {
		marginTop: 3,
		fontSize: 12,
	},
	powerButton: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	rightActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	powerButtonOn: {
		backgroundColor: 'transparent',
	},
	powerButtonOff: {
		backgroundColor: '#111',
	},
})
