import type { DeviceInfo, SoundTouchDevice } from '@soundretouch/api/device'

import { useSoundTouchDevice } from './useSoundTouchDevice'

export const useInfo = (device: SoundTouchDevice | null) => {
	/**
	 * Exposes the current device info payload.
	 */
	const { info } = useSoundTouchDevice(device)

	return {
		info: info as DeviceInfo | null,
	}
}
