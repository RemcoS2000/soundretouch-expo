import { useMemo } from 'react';
import type { SoundTouchDevice } from '@soundretouch/api/device';
import { getDarkTintFromArt, getLightTintFromArt } from '../utils/color';
import { useNowPlayingDevice } from './useNowPlayingDevice';

export const useColorTint = (device: SoundTouchDevice | null) => {
	const { artUrl } = useNowPlayingDevice(device);
	return useMemo(() => {
		const lightTint = getLightTintFromArt(artUrl);
		const darkTint = getDarkTintFromArt(artUrl) ?? '#111';
		return { lightTint, darkTint };
	}, [artUrl]);
};
