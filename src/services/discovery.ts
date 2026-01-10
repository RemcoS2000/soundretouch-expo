import { Platform } from 'react-native';
import { XMLParser } from 'fast-xml-parser';

import { getLocalSubnet } from '../utils';
import { log } from '../utils/logger';

const INFO_PORT = 8090;
const TIMEOUT_MS = 10000;

/**
 * SoundTouch device representation
 */
export type SoundTouchDevice = {
	id: string;
	name: string;
	ip: string;
	port: number;
	model?: string;
	raw?: Record<string, unknown>;
	disconnected?: boolean;
};

/**
 * Parse /info XML response from SoundTouch device
 */
export function parseDescriptorXml(xmlText: string) {
	try {
		const parser = new XMLParser({ ignoreAttributes: false });
		const obj = parser.parse(xmlText);

		const info = obj.info ?? obj.root?.info ?? obj.device; // fallback

		return {
			friendlyName: info?.name,
			modelName: info?.type || info?.modelName,
			raw: obj,
		};
	} catch (err) {
		log.error('XML parse error:', err);
		return { raw: null };
	}
}

/**
 * Fetches information from a single SoundTouch device.
 * @param ip The IP address of the device to fetch.
 * @param onDeviceFound Callback function invoked when the device is found.
 * @param port The port to use for the connection.
 * @param timeoutMs The timeout for the fetch request.
 */
async function fetchDevice(ip: string, onDeviceFound: (device: SoundTouchDevice) => void) {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

		const res = await fetch(`http://${ip}:${INFO_PORT}/info`, { signal: controller.signal });
		clearTimeout(timeout);

		if (!res.ok) return;

		const text = await res.text();
		const parsed = parseDescriptorXml(text);

		const device: SoundTouchDevice = {
			id: ip,
			name: parsed.friendlyName || `SoundTouch ${ip}`,
			ip,
			port: INFO_PORT,
			model: parsed.modelName,
			raw: parsed.raw ?? undefined,
		};

		onDeviceFound(device);
	} catch {
		// Ignore unreachable IPs or timeouts
	}
}

/**
 * Scans the entire local network for SoundTouch devices.
 *
 * @param onDeviceFound Callback function that is invoked for each discovered device.
 * @param options Configuration options for the discovery process.
 */
export async function discoverAllSoundtouchDevices(onDeviceFound: (device: SoundTouchDevice) => void): Promise<void> {
	if (Platform.OS === 'web') {
		log.info('Skipping discovery on web.');
		return;
	}

	const subnet = await getLocalSubnet();
	log.info(`Starting SoundTouch discovery on ${subnet}.0/24...`);

	const promises: Promise<void>[] = [];
	for (let i = 1; i <= 254; i++) {
		const ip = `${subnet}.${i}`;
		promises.push(fetchDevice(ip, onDeviceFound));
	}
	await Promise.all(promises);
}

/**
 * Checks a list of known SoundTouch devices to see if they are still reachable.
 *
 * @param devices An array of SoundTouchDevice objects to check.
 * @param onDeviceFound Callback function that is invoked for each reachable device.
 * @param options Configuration options for the discovery process.
 */
export async function checkKnownSoundtouchDevices(
	devices: SoundTouchDevice[],
	onDeviceFound: (device: SoundTouchDevice) => void
): Promise<void> {
	if (Platform.OS === 'web' || devices.length === 0) {
		return;
	}

	const promises = devices.map((device) => fetchDevice(device.ip, onDeviceFound));
	await Promise.all(promises);
}
