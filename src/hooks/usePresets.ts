import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { Presets, SoundTouchDevice } from '@soundretouch/api/device';

export const usePresets = (device: SoundTouchDevice | null) => {
	const [presets, setPresets] = useState<Presets>([]);
	const visiblePresets = device ? presets : [];

	/**
	 * Loads the initial presets payload, subscribes to updates,
	 * and refreshes on app resume.
	 */
	useEffect(() => {
		if (!device) return;

		let cancelled = false;
		let unsubscribe = () => {};

		const applyPresets = (data: Presets) => {
			if (cancelled) return;
			setPresets(data);
		};

		const subscribe = () => {
			unsubscribe();
			unsubscribe = device.onPresetsUpdated((data) => {
				applyPresets(data);
			});
		};

		const load = async () => {
			try {
				applyPresets(await device.presets());
			} catch {
				applyPresets([]);
			}
		};

		subscribe();
		void load();

		const appStateSubscription = AppState.addEventListener('change', async (state) => {
			if (state === 'active') {
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

	return {
		presets: visiblePresets,
	};
};
