import React, { useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { useAppSettings } from '../state/AppSettingsContext'

import { volumeFromDrag, type VolumeSliderProps } from './VolumeSlider.types'

const THUMB_TARGET = 48

/**
 * Adjusts volume only when the thumb is dragged horizontally. Track taps do nothing.
 * Movement is relative to the starting volume, and only release commits a change.
 */
export default function VolumeSlider(props: VolumeSliderProps) {
	const { colors } = useAppSettings()
	const [width, setWidth] = useState(0)
	const drag = useRef<{ startX: number; startValue: number; value: number; width: number; moved: boolean } | null>(null)

	return (
		<View
			accessible
			accessibilityRole="adjustable"
			accessibilityLabel="Speaker volume"
			accessibilityHint="Drag the thumb to adjust volume. Use increment or decrement for small changes."
			accessibilityState={{ disabled: props.disabled }}
			accessibilityValue={{ min: 0, max: 100, now: Math.round(props.value), text: `${Math.round(props.value)} percent` }}
			accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
			onAccessibilityAction={({ nativeEvent }) => {
				if (props.disabled || !['increment', 'decrement'].includes(nativeEvent.actionName)) {
					return
				}

				const step = nativeEvent.actionName === 'increment' ? 5 : -5

				props.onSlidingComplete(Math.max(0, Math.min(100, props.value + step)))
			}}
			onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
			style={{ height: THUMB_TARGET, opacity: props.disabled ? 0.5 : 1 }}
		>
			<View pointerEvents="none" style={[styles.track, { backgroundColor: colors.border }]} />
			<View
				pointerEvents="none"
				style={[styles.fill, { width: (Math.max(0, width - THUMB_TARGET) * props.value) / 100, backgroundColor: colors.accent }]}
			/>
			<View
				testID="volume-thumb"
				onStartShouldSetResponder={() => !props.disabled}
				onResponderGrant={({ nativeEvent }) => {
					drag.current = {
						startX: nativeEvent.pageX,
						startValue: props.value,
						value: props.value,
						width: Math.max(0, width - THUMB_TARGET),
						moved: false,
					}
				}}
				onResponderMove={({ nativeEvent }) => {
					const active = drag.current

					if (!active || props.disabled) {
						return
					}

					const distance = nativeEvent.pageX - active.startX

					if (!active.moved && Math.abs(distance) < 6) {
						return
					}

					active.moved = true
					active.value = volumeFromDrag(active.startValue, distance, active.width)
					props.onValueChange(active.value)
				}}
				onResponderRelease={() => {
					const completed = drag.current

					drag.current = null

					if (!props.disabled && completed && completed.value !== completed.startValue) {
						props.onSlidingComplete(completed.value)
					} else {
						props.onCancel()
					}
				}}
				onResponderTerminate={() => {
					drag.current = null
					props.onCancel()
				}}
				style={[styles.thumbTarget, { left: (Math.max(0, width - THUMB_TARGET) * props.value) / 100 }]}
			>
				<View style={[styles.thumb, { backgroundColor: colors.accent }]} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	track: { position: 'absolute', left: 24, right: 24, top: 22, height: 4, borderRadius: 2 },
	fill: { position: 'absolute', left: 24, top: 22, height: 4, borderRadius: 2 },
	thumbTarget: { position: 'absolute', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
	thumb: { width: 24, height: 24, borderRadius: 12 },
})
