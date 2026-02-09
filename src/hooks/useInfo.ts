import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { DeviceInfo, SoundTouchDevice } from '@soundretouch/api/device';

// Simple in-memory cache keyed by host.
const infoCache: Record<string, DeviceInfo | undefined> = {};

export const useInfo = (device: SoundTouchDevice | null) => {
	const [info, setInfo] = useState<DeviceInfo | null>(null);
	const visibleInfo = device ? (info ?? infoCache[device.host] ?? null) : null;

	useEffect(() => {
		if (!device) return;

		let cancelled = false;

		const load = async () => {
			try {
				const nextInfo = await device.info();
				infoCache[device.host] = nextInfo;
				if (!cancelled) setInfo(nextInfo);
			} catch {
				if (!cancelled) setInfo(null);
			}
		};

		void load();

		const appStateSubscription = AppState.addEventListener('change', async (state) => {
			if (state === 'active') {
				await load();
			}
		});

		return () => {
			cancelled = true;
			appStateSubscription.remove();
		};
	}, [device]);

	return { info: visibleInfo };
};
