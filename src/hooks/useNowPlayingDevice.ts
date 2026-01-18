import { useCallback, useEffect, useState } from 'react';
import type { DeviceInfo, NowPlaying, SoundTouchDevice } from '@soundretouch/api/device';

const PROGRESS_TICK_MS = 100;
const PROGRESS_STEP_SECONDS = 0.1;

export const useNowPlayingDevice = (device: SoundTouchDevice | null) => {
	const [info, setInfo] = useState<DeviceInfo | null>(null);
	const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
	const [displayTime, setDisplayTime] = useState<number | null>(null);
	const effectiveNowPlaying = device ? nowPlaying : null;
	const effectiveInfo = device ? info : null;
	const effectiveDisplayTime = device ? displayTime : null;
	const artUrl = effectiveNowPlaying?.art?.['#text'] || effectiveNowPlaying?.ContentItem?.containerArt;

	/**
	 * Syncs now playing data and resets the display time ticker to the device time.
	 * @param data - Latest now playing payload or null when unavailable.
	 */
	const setPlaying = useCallback((data: NowPlaying | null) => {
		setNowPlaying(data);
		setDisplayTime(data?.time?.['#text'] ?? null);
	}, []);

	/**
	 * Subscribes to device updates and loads the initial device info + now playing state.
	 */
	useEffect(() => {
		if (!device) return;
		let cancelled = false;
		const unsubscribe = device.onNowPlayingUpdated((data) => {
			if (!cancelled) setPlaying(data);
		});

		(async () => {
			try {
				const [deviceInfo, playing] = await Promise.all([device.info(), device.nowPlaying()]);
				if (cancelled) return;
				setInfo(deviceInfo);
				setPlaying(playing);
			} catch {
				if (cancelled) return;
				setInfo(null);
				setPlaying(null);
			}
		})();

		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, [device, setPlaying]);

	/**
	 * Smooths the progress bar by incrementing displayTime while playback is active.
	 */
	useEffect(() => {
		if (!device || effectiveNowPlaying?.playStatus !== 'PLAY_STATE') return;
		const totalTime = effectiveNowPlaying?.time?.total ?? 0;
		if (!totalTime) return;
		const interval = setInterval(() => {
			setDisplayTime((prev) => {
				const current = prev ?? effectiveNowPlaying?.time?.['#text'] ?? 0;
				return Math.min(current + PROGRESS_STEP_SECONDS, totalTime);
			});
		}, PROGRESS_TICK_MS);
		return () => clearInterval(interval);
	}, [device, effectiveNowPlaying]);

	return {
		info: effectiveInfo,
		nowPlaying: effectiveNowPlaying,
		displayTime: effectiveDisplayTime,
		artUrl,
	};
};
