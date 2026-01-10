import { useCallback, useEffect, useRef, useState } from 'react';
import type { SoundTouchDevice } from '../services/discovery';
import { discoverAllSoundtouchDevices } from '../services/discovery';
import { log } from '../utils/logger';

export function useSoundTouchDiscovery() {
	const [devices, setDevices] = useState<SoundTouchDevice[]>([]);
	const [loading, setLoading] = useState(false);
	const isScanning = useRef(false);

	const scanFull = useCallback(async () => {
		if (isScanning.current) return;
		isScanning.current = true;

		setLoading(true);
		log.info('Starting full SoundTouch discovery...');

		const foundDevices: SoundTouchDevice[] = [];

		try {
			await discoverAllSoundtouchDevices((device) => {
				log.debug('Device discovered (full scan):', device);
				foundDevices.push(device);
			});

			foundDevices.sort((a, b) => a.name.localeCompare(b.name));
			setDevices(foundDevices);
			log.info(`Full discovery complete: ${foundDevices.length} device(s) found`);
		} catch (error) {
			log.error('An error occurred during device discovery:', error);
		} finally {
			setLoading(false);
			isScanning.current = false;
		}
	}, []);

	useEffect(() => {
		scanFull();
	}, [scanFull]);

	return { devices, loading, refresh: scanFull, setDevices };
}
