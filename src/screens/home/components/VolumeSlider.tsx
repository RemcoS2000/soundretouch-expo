import { MaterialIcons } from '@expo/vector-icons'
import type { SoundTouchDevice } from '@soundretouch/api/device'

import React, { useState } from 'react'
import type { GestureResponderEvent } from 'react-native'
import { StyleSheet, Text, View } from 'react-native'

import { useVolume } from '../../../hooks/useVolume'
import { useAppSettings } from '../../../state/AppSettingsContext'

type VolumeSliderProps = {
	device: SoundTouchDevice | null
}

const normalizeVolume = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
const normalizeRatio = (value: number) => Math.max(0, Math.min(1, value))
const toPercent = (ratio: number): `${number}%` => `${Number((normalizeRatio(ratio) * 100).toFixed(2))}%`

export function VolumeSlider({ device }: VolumeSliderProps) {
	const { colors } = useAppSettings()
	const { volume, setVolume } = useVolume(device)
	const [barWidth, setBarWidth] = useState(0)
	const [dragRatio, setDragRatio] = useState<number | null>(null)

	const currentRatio = dragRatio ?? volume / 100
	const fillWidth = toPercent(currentRatio)

	const ratioFromEvent = (event: GestureResponderEvent) => (barWidth ? normalizeRatio(event.nativeEvent.locationX / barWidth) : 0)

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={styles.labelWrap}>
					<MaterialIcons name="volume-up" size={16} color={colors.icon} />
					<Text style={[styles.label, { color: colors.textMuted }]}>Volume</Text>
				</View>
				<Text style={[styles.value, { color: colors.text }]}>{normalizeVolume(currentRatio * 100)}%</Text>
			</View>
			<View
				onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
				onStartShouldSetResponderCapture={() => true}
				onMoveShouldSetResponderCapture={() => true}
				onStartShouldSetResponder={() => true}
				onMoveShouldSetResponder={() => true}
				onResponderTerminationRequest={() => false}
				onResponderGrant={(event) => setDragRatio(ratioFromEvent(event))}
				onResponderMove={(event) => setDragRatio(ratioFromEvent(event))}
				onResponderRelease={(event) => {
					const nextRatio = ratioFromEvent(event)
					setDragRatio(null)
					void setVolume(normalizeVolume(nextRatio * 100))
				}}
				onResponderTerminate={() => setDragRatio(null)}
				accessible
				accessibilityRole="adjustable"
				accessibilityLabel="Volume slider"
				style={styles.touchArea}
			>
				<View style={[styles.track, { backgroundColor: colors.progressTrack }]} />
				<View style={[styles.fill, { backgroundColor: colors.progressFill, width: fillWidth }]} />
				<View style={[styles.thumb, { backgroundColor: colors.progressFill, left: fillWidth }]} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		marginTop: 8,
		paddingHorizontal: 2,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 6,
	},
	labelWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	label: {
		fontSize: 11,
		fontWeight: '600',
		letterSpacing: 0.2,
		textTransform: 'uppercase',
	},
	value: {
		fontSize: 12,
		fontWeight: '600',
	},
	touchArea: {
		height: 28,
		justifyContent: 'center',
	},
	track: {
		height: 6,
		borderRadius: 999,
	},
	fill: {
		position: 'absolute',
		top: '50%',
		height: 6,
		marginTop: -3,
		borderRadius: 999,
	},
	thumb: {
		position: 'absolute',
		top: '50%',
		width: 10,
		height: 10,
		borderRadius: 5,
		marginTop: -5,
		marginLeft: -5,
	},
})
