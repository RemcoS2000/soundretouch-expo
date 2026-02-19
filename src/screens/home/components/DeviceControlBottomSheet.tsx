import { MaterialIcons } from '@expo/vector-icons'
import type { SoundTouchDevice } from '@soundretouch/api/device'

import React, { useRef, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'

import { BottomSheet } from '../../../components/BottomSheet'
import { useAppSettings } from '../../../state/AppSettingsContext'

import { DevicePresetSelection } from './DevicePresetSelection'
import { DeviceSourceSelection } from './DeviceSourceSelection'
import { DeviceSummary } from './DeviceSummary'
import { ZoneControl } from './ZoneControl'

const FOOTER_HEIGHT = 84

type DeviceControlBottomSheetProps = {
	/** Active device for this sheet. When `null`, the component renders nothing. */
	device: SoundTouchDevice | null
	/** Notifies parent when the bottom sheet is expanded/collapsed. */
	onExpandedChange?: (isExpanded: boolean) => void
}

export function DeviceControlBottomSheet({ device, onExpandedChange }: DeviceControlBottomSheetProps) {
	// BottomSheet requires a concrete container height to calculate open/closed offsets.
	const { height: screenHeight } = useWindowDimensions()
	const { colors } = useAppSettings()
	const [activePanel, setActivePanel] = useState<'source' | 'zone'>('source')
	const toggleRef = useRef<() => void>(() => {})
	const isExpandedRef = useRef(false)

	// Keep home screen clean when no active speaker exists.
	if (!device) return null

	const renderTopContent = ({ isExpanded, toggle }: { isExpanded: boolean; toggle: () => void }) => {
		toggleRef.current = toggle
		isExpandedRef.current = isExpanded

		return (
			<DeviceSummary
				device={device}
				isExpanded={isExpanded}
				onPress={() => {
					if (isExpanded) setActivePanel('source')
					toggle()
				}}
			/>
		)
	}

	return (
		<BottomSheet footerHeight={FOOTER_HEIGHT} screenHeight={screenHeight} renderTopContent={renderTopContent} onExpandedChange={onExpandedChange}>
			<View style={styles.panelButtonRow}>
				<TouchableOpacity
					style={[styles.panelButton, { backgroundColor: activePanel === 'source' ? colors.surfaceActive : colors.surface }]}
					accessibilityRole="button"
					accessibilityLabel="Source input"
					onPress={() => setActivePanel('source')}
				>
					<MaterialIcons name="input" size={16} color={colors.icon} />
					<Text style={[styles.panelButtonText, { color: colors.text }]}>Source input</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.panelButton, { backgroundColor: activePanel === 'zone' ? colors.surfaceActive : colors.surface }]}
					accessibilityRole="button"
					accessibilityLabel="Zone control"
					onPress={() => setActivePanel('zone')}
				>
					<MaterialIcons name="speaker-group" size={16} color={colors.icon} />
					<Text style={[styles.panelButtonText, { color: colors.text }]}>Zone control</Text>
				</TouchableOpacity>
			</View>
			{activePanel === 'source' ? (
				<View style={styles.sourcePanel}>
					<DevicePresetSelection
						device={device}
						onSelected={() => {
							if (isExpandedRef.current) toggleRef.current()
						}}
					/>
					<DeviceSourceSelection
						device={device}
						onSelected={() => {
							if (isExpandedRef.current) toggleRef.current()
						}}
					/>
				</View>
			) : (
				<ZoneControl device={device} />
			)}
		</BottomSheet>
	)
}

const styles = StyleSheet.create({
	panelButtonRow: {
		marginTop: 2,
		marginBottom: -4,
		flexDirection: 'row',
		gap: 8,
	},
	panelButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 12,
		backgroundColor: '#f3f4f6',
		flex: 1,
		justifyContent: 'center',
	},
	panelButtonText: {
		fontSize: 13,
		fontWeight: '600',
	},
	sourcePanel: {
		flex: 1,
	},
})
