import type { SliderProps } from '@react-native-community/slider'

import React, { useRef } from 'react'

/**
 * Native range input provides keyboard and screen-reader adjustment on web.
 */
export default function Slider({
	value = 0,
	minimumValue = 0,
	maximumValue = 100,
	step = 1,
	disabled,
	onValueChange,
	onSlidingComplete,
	accessibilityLabel,
	minimumTrackTintColor,
}: SliderProps) {
	const committed = useRef<number | null>(null)

	/**
	 * Commits a changed value once when pointer, keyboard or focus interaction ends.
	 */
	const commit = (event: React.SyntheticEvent<HTMLInputElement>) => {
		const next = Number(event.currentTarget.value)

		if (committed.current === next) {
			return
		}

		committed.current = next
		onSlidingComplete?.(next)
	}

	return (
		<input
			type="range"
			aria-label={accessibilityLabel}
			min={minimumValue}
			max={maximumValue}
			step={step}
			value={value}
			disabled={disabled}
			onChange={(event) => {
				committed.current = null
				onValueChange?.(Number(event.currentTarget.value))
			}}
			onPointerUp={commit}
			onKeyUp={commit}
			onBlur={commit}
			style={{ width: '100%', height: 48, margin: 0, accentColor: typeof minimumTrackTintColor === 'string' ? minimumTrackTintColor : undefined }}
		/>
	)
}
