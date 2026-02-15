import { MaterialIcons } from '@expo/vector-icons'
import type { SoundTouchDevice } from '@soundretouch/api/device'

import React, { useRef, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'

import { BottomSheet } from '../../../components/BottomSheet'

import { DevicePresetSelectionCard } from './DevicePresetSelectionCard'
import { DeviceSourceSelectionCard } from './DeviceSourceSelectionCard'
import { DeviceSummaryCard } from './DeviceSummaryCard'
import { ZoneControlCard } from './ZoneControlCard'

const FOOTER_HEIGHT = 84

type DeviceControlBottomSheetProps = {
	/** Active device for this sheet. When `null`, the component renders nothing. */
	device: SoundTouchDevice | null
}

export function DeviceControlBottomSheet({ device }: DeviceControlBottomSheetProps) {
	// BottomSheet requires a concrete container height to calculate open/closed offsets.
	const { height: screenHeight } = useWindowDimensions()
	const [activePanel, setActivePanel] = useState<'source' | 'zone'>('source')
	const toggleRef = useRef<() => void>(() => {})
	const isExpandedRef = useRef(false)

	// Keep home screen clean when no active speaker exists.
	if (!device) return null

	const renderTopContent = ({ isExpanded, toggle }: { isExpanded: boolean; toggle: () => void }) => {
		toggleRef.current = toggle
		isExpandedRef.current = isExpanded

		return (
			<DeviceSummaryCard
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
		<BottomSheet footerHeight={FOOTER_HEIGHT} screenHeight={screenHeight} renderTopContent={renderTopContent}>
			<View style={styles.panelButtonRow}>
				<TouchableOpacity
					style={[styles.panelButton, activePanel === 'source' ? styles.panelButtonActive : null]}
					accessibilityRole="button"
					accessibilityLabel="Source input"
					onPress={() => setActivePanel('source')}
				>
					<MaterialIcons name="input" size={16} color="#111" />
					<Text style={styles.panelButtonText}>Source input</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.panelButton, activePanel === 'zone' ? styles.panelButtonActive : null]}
					accessibilityRole="button"
					accessibilityLabel="Zone control"
					onPress={() => setActivePanel('zone')}
				>
					<MaterialIcons name="speaker-group" size={16} color="#111" />
					<Text style={styles.panelButtonText}>Zone control</Text>
				</TouchableOpacity>
			</View>
			{activePanel === 'source' ? (
				<View style={styles.sourcePanel}>
					<DevicePresetSelectionCard device={device} />
					<DeviceSourceSelectionCard
						device={device}
						onSelected={() => {
							if (isExpandedRef.current) toggleRef.current()
						}}
					/>
				</View>
			) : (
				<ZoneControlCard device={device} />
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
	panelButtonActive: {
		backgroundColor: '#e5e7eb',
	},
	panelButtonText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#111',
	},
	sourcePanel: {
		flex: 1,
	},
})
