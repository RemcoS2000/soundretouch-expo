import React, { useRef } from 'react'

import { useAppSettings } from '../state/AppSettingsContext'

import { volumeFromDrag, type VolumeSliderProps } from './VolumeSlider.types'

/**
 * Provides a keyboard-accessible range control whose track cannot be tapped to change volume.
 * Pointer movement starts at the thumb and commits only when that gesture is released.
 */
export default function VolumeSlider({ value, disabled, onValueChange, onSlidingComplete, onCancel }: VolumeSliderProps) {
	const { colors } = useAppSettings()
	const drag = useRef<{ pointerId: number; startX: number; startValue: number; value: number; width: number; moved: boolean } | null>(null)

	return (
		<div
			role="slider"
			tabIndex={disabled ? -1 : 0}
			aria-label="Speaker volume"
			aria-description="Drag the thumb to adjust volume, or use the arrow keys for small changes."
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(value)}
			aria-valuetext={`${Math.round(value)} percent`}
			aria-disabled={disabled}
			onKeyDown={(event) => {
				if (!['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
					return
				}

				event.preventDefault()

				if (disabled || event.repeat || drag.current) {
					return
				}

				if (['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'].includes(event.key)) {
					const step = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 5 : -5

					onSlidingComplete(Math.max(0, Math.min(100, value + step)))
				}
			}}
			style={{ position: 'relative', width: '100%', height: 48, opacity: disabled ? 0.5 : 1 }}
		>
			<div
				aria-hidden="true"
				style={{ position: 'absolute', left: 24, right: 24, top: 22, height: 4, borderRadius: 2, background: colors.border, pointerEvents: 'none' }}
			/>
			<div
				aria-hidden="true"
				style={{
					position: 'absolute',
					left: 24,
					top: 22,
					width: `calc(${value}% - ${value * 0.48}px)`,
					height: 4,
					borderRadius: 2,
					background: colors.accent,
					pointerEvents: 'none',
				}}
			/>
			<div
				data-testid="volume-thumb"
				onPointerDown={(event) => {
					// Prevent the browser's default jump-to-position behavior, even on the thumb.
					event.preventDefault()

					if (disabled || !event.isPrimary || event.button !== 0) {
						return
					}

					const bounds = event.currentTarget.parentElement!.getBoundingClientRect()
					const width = Math.max(0, bounds.width - 48)

					event.currentTarget.parentElement!.focus()
					event.currentTarget.setPointerCapture(event.pointerId)
					drag.current = { pointerId: event.pointerId, startX: event.clientX, startValue: value, value, width, moved: false }
				}}
				onPointerMove={(event) => {
					const active = drag.current

					if (disabled || !active || active.pointerId !== event.pointerId) {
						return
					}

					const distance = event.clientX - active.startX

					if (!active.moved && Math.abs(distance) < 6) {
						return
					}

					active.moved = true
					active.value = volumeFromDrag(active.startValue, distance, active.width)
					onValueChange(active.value)
				}}
				onPointerUp={(event) => {
					const completed = drag.current

					if (!completed || completed.pointerId !== event.pointerId) {
						return
					}

					drag.current = null
					event.currentTarget.releasePointerCapture(event.pointerId)

					if (!disabled && completed.value !== completed.startValue) {
						onSlidingComplete(completed.value)
					} else {
						onCancel()
					}
				}}
				onLostPointerCapture={() => {
					if (!drag.current) {
						return
					}

					drag.current = null
					onCancel()
				}}
				onPointerCancel={() => {
					drag.current = null
					onCancel()
				}}
				aria-hidden="true"
				style={{
					position: 'absolute',
					left: `calc(${value}% - ${value * 0.48}px)`,
					width: 48,
					height: 48,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					touchAction: 'none',
					cursor: disabled ? 'default' : 'grab',
				}}
			>
				<div style={{ width: 24, height: 24, borderRadius: 12, background: colors.accent }} />
			</div>
		</div>
	)
}
