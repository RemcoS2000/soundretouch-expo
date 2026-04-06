import type { NowPlaying, SoundTouchDevice } from '@soundretouch/api/device'

import { useSoundTouchDevice } from './useSoundTouchDevice'

export const useNowPlaying = (device: SoundTouchDevice | null) => {
	/**
	 * Exposes live now-playing metadata for the selected device.
	 */
	const { nowPlaying } = useSoundTouchDevice(device)

	return {
		nowPlaying: nowPlaying as NowPlaying | null,
	}
}
