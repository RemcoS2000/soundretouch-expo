/**
 * FUTURE: Replace subnet scanning with a more efficient discovery strategy.
 */

import { XMLParser } from 'fast-xml-parser';
import { fetch as expoFetch } from 'expo/fetch';

import { log } from '../utils/logger';
import { getLocalSubnet } from '../utils/network';
import { fetch, devProxyEnabled, getDevProxyBaseUrl } from '../utils/fetch';

const SOUNDTOUCH_DISCOVERY_INFO_PORT = Number(process.env.EXPO_PUBLIC_SOUNDTOUCH_DISCOVERY_INFO_PORT) || 8090;
const DISCOVERY_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_DISCOVERY_TIMEOUT_MS) || 10000;

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
		const timeout = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);

		const res = await fetch(`http://${ip}:${SOUNDTOUCH_DISCOVERY_INFO_PORT}/info`, { signal: controller.signal });
		clearTimeout(timeout);

		if (!res.ok) return;

		const text = await res.text();
		const parsed = parseDescriptorXml(text);

		const device: SoundTouchDevice = {
			id: ip,
			name: parsed.friendlyName || `SoundTouch ${ip}`,
			ip,
			port: SOUNDTOUCH_DISCOVERY_INFO_PORT,
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
	const subnet = await getLocalSubnet();
	log.info(`Starting SoundTouch discovery on ${subnet}.0/24...`);

	/**
	 * TODO: Replace subnet scanning with a more efficient discovery strategy.
	 */
	/**
	 * Prefer proxy discovery on Expo Web dev to avoid browser connection caps.
	 */
	if (devProxyEnabled()) {
		try {
			const devices = await discoverViaProxy(subnet, SOUNDTOUCH_DISCOVERY_INFO_PORT);
			devices.forEach(onDeviceFound);
		} catch (err) {
			log.warn('Proxy discovery error:', err);
		}
		return;
	}

	/**
	 * Direct scan for native environments and non-proxy web runs.
	 */
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
	if (devices.length === 0) {
		return;
	}

	const promises = devices.map((device) => fetchDevice(device.ip, onDeviceFound));
	await Promise.all(promises);
}

/**
 * Web dev discovery scans the full subnet and can exceed browser per-origin limits.
 * Use the proxy endpoint to run the scan server-side.
 */
async function discoverViaProxy(subnet: string, port: number): Promise<SoundTouchDevice[]> {
	const discoverUrl = `${getDevProxyBaseUrl()}/soundtouch/discover?subnet=${encodeURIComponent(subnet)}&port=${port}&rangeStart=1&rangeEnd=254`;
	log.info(`Starting proxy discovery via ${discoverUrl}`);
	const response = await expoFetch(discoverUrl);
	if (!response.ok) {
		throw new Error(`Proxy discovery failed with status ${response.status}`);
	}

	const data = (await response.json()) as {
		devices?: { ip: string; infoXml: string }[];
	};

	return (data.devices ?? []).map(({ ip, infoXml }) => {
		const parsed = parseDescriptorXml(infoXml);
		return {
			id: ip,
			name: parsed.friendlyName || `SoundTouch ${ip}`,
			ip,
			port,
			model: parsed.modelName,
			raw: parsed.raw ?? undefined,
		};
	});
}
