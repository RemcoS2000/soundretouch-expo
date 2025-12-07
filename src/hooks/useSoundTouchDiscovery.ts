import { useEffect, useRef, useState } from 'react';
import type { SoundTouchDevice } from '../services/discovery';
import { discoverSoundtouchDevices } from '../services/discovery';

export function useSoundTouchDiscovery(pollInterval = 0) {
	const [devices, setDevices] = useState<SoundTouchDevice[]>([]);
	const [loading, setLoading] = useState(false);
	const mounted = useRef(true);
	const intervalRef = useRef<number | null>(null);

	async function scan() {
		setLoading(true);
		try {
			const found = await discoverSoundtouchDevices();
			if (!mounted.current) return;
			found.sort((a, b) => a.name.localeCompare(b.name));
			setDevices(found);
		} finally {
			if (mounted.current) setLoading(false);
		}
	}

	useEffect(() => {
		mounted.current = true;
		scan();

		if (pollInterval > 0) {
			intervalRef.current = window.setInterval(scan, pollInterval);
		}
		return () => {
			mounted.current = false;
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [pollInterval]);

	return { devices, loading, refresh: scan };
}
