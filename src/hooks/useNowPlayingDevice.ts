import { useCallback, useEffect, useState } from 'react';
import type { DeviceInfo, NowPlaying, SoundTouchDevice } from '@soundretouch/api/device';

const PROGRESS_TICK_MS = 100;
const PROGRESS_STEP_SECONDS = 0.1;

export const useNowPlayingDevice = (device: SoundTouchDevice) => {
	const [info, setInfo] = useState<DeviceInfo | null>(null);
	const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
	const [displayTime, setDisplayTime] = useState<number | null>(null);

	const applyNowPlaying = useCallback((data: NowPlaying | null) => {
		setNowPlaying(data);
		setDisplayTime(data?.time?.['#text'] ?? null);
	}, []);

	useEffect(() => {
		let cancelled = false;
		const unsubscribe = device.onNowPlayingUpdated((data) => {
			if (!cancelled) applyNowPlaying(data);
		});

		(async () => {
			try {
				const [deviceInfo, playing] = await Promise.all([device.info(), device.nowPlaying()]);
				if (cancelled) return;
				setInfo(deviceInfo);
				applyNowPlaying(playing);
			} catch {
				if (cancelled) return;
				setInfo(null);
				applyNowPlaying(null);
			}
		})();

		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, [device, applyNowPlaying]);

	useEffect(() => {
		const totalTime = nowPlaying?.time?.total ?? 0;
		if (!totalTime || nowPlaying?.playStatus !== 'PLAY_STATE') return;
		const interval = setInterval(() => {
			setDisplayTime((prev) => {
				const current = prev ?? nowPlaying?.time?.['#text'] ?? 0;
				return Math.min(current + PROGRESS_STEP_SECONDS, totalTime || current + PROGRESS_STEP_SECONDS);
			});
		}, PROGRESS_TICK_MS);
		return () => clearInterval(interval);
	}, [nowPlaying]);

	return { info, nowPlaying, displayTime };
};
