import type { SoundTouchDevice } from '@soundretouch/api/device'

import { useCallback, useState } from 'react'

import { useSoundTouchDevice } from './useSoundTouchDevice'

const clampVolume = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

export const useVolume = (device: SoundTouchDevice | null) => {
	/**
	 * Exposes live volume state and the volume update action.
	 */
	const { volume: volumeData, isVolumeLoading } = useSoundTouchDevice(device)
	const [isUpdating, setIsUpdating] = useState(false)
	const nextVolume = volumeData?.actualvolume ?? volumeData?.targetvolume
	const volume = typeof nextVolume === 'number' ? clampVolume(nextVolume) : 0
	const muteEnabled = volumeData?.muteenabled ?? false
	const setVolume = useCallback(
		async (value: number) => {
			if (!device) return
			setIsUpdating(true)
			try {
				await device.setVolume(clampVolume(value), false)
			} finally {
				setIsUpdating(false)
			}
		},
		[device]
	)

	return {
		volume,
		muteEnabled,
		isLoading: isVolumeLoading,
		isUpdating,
		setVolume,
	}
}
