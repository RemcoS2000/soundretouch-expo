import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { NowPlaying, SoundTouchDevice } from '@soundretouch/api/device';

const PROGRESS_TICK_MS = 100;
const PROGRESS_STEP_SECONDS = 0.1;

export const useNowPlaying = (device: SoundTouchDevice | null) => {
	const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
	const [displayTime, setDisplayTime] = useState<number | null>(null);
	const visibleNowPlaying = device ? nowPlaying : null;
	const visibleDisplayTime = device ? displayTime : null;
	const artUrl = visibleNowPlaying?.art?.['#text'];

	/**
	 * Loads the initial now playing payload, subscribes to updates,
	 * and refreshes on app resume.
	 */
	useEffect(() => {
		if (!device) return;

		let cancelled = false;
		let unsubscribe = () => {};

		const applyNowPlaying = (data: NowPlaying | null) => {
			if (cancelled) return;
			setNowPlaying(data);
			setDisplayTime(data?.time?.['#text'] ?? null);
		};

		const subscribe = () => {
			unsubscribe();
			unsubscribe = device.onNowPlayingUpdated(applyNowPlaying);
		};

		const load = async () => {
			try {
				applyNowPlaying(await device.nowPlaying());
			} catch {
				applyNowPlaying(null);
			}
		};

		subscribe();
		void load();

		const appStateSubscription = AppState.addEventListener('change', async (state) => {
			if (state === 'active') {
				// Re-subscribe and refresh when returning from background.
				subscribe();
				await load();
			}
		});

		return () => {
			cancelled = true;
			appStateSubscription.remove();
			unsubscribe();
		};
	}, [device]);

	/**
	 * Smooths the progress bar by incrementing displayTime while playback is active.
	 */
	useEffect(() => {
		if (!device || visibleNowPlaying?.playStatus !== 'PLAY_STATE') return;

		const totalTime = visibleNowPlaying?.time?.total ?? 0;
		if (!totalTime) return;

		const interval = setInterval(() => {
			setDisplayTime((prev) => {
				const current = prev ?? visibleNowPlaying?.time?.['#text'] ?? 0;
				return Math.min(current + PROGRESS_STEP_SECONDS, totalTime);
			});
		}, PROGRESS_TICK_MS);

		return () => clearInterval(interval);
	}, [device, visibleNowPlaying]);

	return {
		nowPlaying: visibleNowPlaying,
		displayTime: visibleDisplayTime,
		artUrl,
	};
};
