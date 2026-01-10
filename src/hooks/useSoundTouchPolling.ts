import { useCallback, useEffect, useRef } from 'react';
import type { SoundTouchDevice } from '../services/discovery';
import { checkKnownSoundtouchDevices } from '../services/discovery';
import { log } from '../utils/logger';

const POLL_INTERVAL = 30000;

/**
 * Hook to poll known SoundTouch devices for reachability.
 * @param devices - Current devices array from parent state
 * @param setDevices - State setter from parent
 */
export function useSoundTouchPolling(devices: SoundTouchDevice[], setDevices: React.Dispatch<React.SetStateAction<SoundTouchDevice[]>>) {
	const devicesRef = useRef(devices);
	const intervalRef = useRef<number | null>(null);

	// Keep the ref in sync with latest devices
	useEffect(() => {
		devicesRef.current = devices;
	}, [devices]);

	const pollKnown = useCallback(async () => {
		const currentDevices = devicesRef.current;
		if (currentDevices.length === 0) return;

		log.info(`Polling ${currentDevices.length} known device(s)...`);
		const foundDeviceIds = new Set<string>();

		await checkKnownSoundtouchDevices(currentDevices, (device) => {
			log.debug('Device still reachable:', device);
			foundDeviceIds.add(device.id);

			// Update state per-device asynchronously
			setTimeout(() => {
				setDevices((prev) => prev.map((d) => (d.id === device.id ? { ...device, disconnected: false } : d)));
			}, 0);
		});

		// After polling all devices, mark the ones not found as disconnected
		setDevices((prev) =>
			prev.map((d) => (currentDevices.some((cd) => cd.id === d.id) && !foundDeviceIds.has(d.id) ? { ...d, disconnected: true } : d))
		);

		log.info('Polling complete');
	}, [setDevices]);

	// Polling setup
	useEffect(() => {
		// Initial poll
		pollKnown();

		// Start interval
		intervalRef.current = window.setInterval(pollKnown, POLL_INTERVAL);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [pollKnown]);
}
