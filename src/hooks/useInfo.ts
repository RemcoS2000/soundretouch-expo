import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { DeviceInfo, SoundTouchDevice } from '@soundretouch/api/device';

export const useInfo = (device: SoundTouchDevice | null) => {
	const [info, setInfo] = useState<DeviceInfo | null>(null);
	const visibleInfo = device ? info : null;

	useEffect(() => {
		if (!device) return;

		let cancelled = false;

		const load = async () => {
			try {
				const nextInfo = await device.info();
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
