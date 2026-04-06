import type { PresetId, Presets, SoundTouchDevice } from '@soundretouch/api/device'

import { useCallback } from 'react'

import { useSoundTouchDevice } from './useSoundTouchDevice'

export const usePresets = (device: SoundTouchDevice | null) => {
	/**
	 * Exposes the device presets and preset selection action.
	 */
	const { presets } = useSoundTouchDevice(device)
	const selectPreset = useCallback(
		async (presetId: PresetId) => {
			if (!device) return
			await device.keyPressAndRelease(`PRESET_${presetId}`)
		},
		[device]
	)

	return {
		presets: presets as Presets,
		selectPreset,
	}
}
