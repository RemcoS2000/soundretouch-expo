import type { SoundTouchDevice } from '@soundretouch/api/device'

import { useCallback } from 'react'

export const useUserTrackControl = (device: SoundTouchDevice | null) => {
	/**
	 * Wires up the SEEK_TO_TIME user track control to allow scrubbing within the current track.
	 */
	const seekToTime = useCallback(
		async (seconds: number) => {
			if (!device) return
			await device.setUserTrackControl('SEEK_TO_TIME', seconds)
		},
		[device]
	)

	return {
		seekToTime,
	}
}
