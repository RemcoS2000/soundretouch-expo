export type VolumeSliderProps = {
	value: number
	disabled?: boolean
	onValueChange: (value: number) => void
	onSlidingComplete: (value: number) => void
	onCancel: () => void
}

/**
 * Converts movement from the starting thumb position into a bounded volume preview.
 */
export function volumeFromDrag(startValue: number, distance: number, trackWidth: number): number {
	if (trackWidth <= 0) {
		return startValue
	}

	return Math.max(0, Math.min(100, Math.round(startValue + (distance / trackWidth) * 100)))
}
