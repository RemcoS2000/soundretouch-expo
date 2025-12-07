import { Platform } from 'react-native';
import Zeroconf from 'react-native-zeroconf';
import { XMLParser } from 'fast-xml-parser';

export type SoundTouchDevice = {
	id: string;
	name: string;
	ip: string;
	port: number;
	model?: string;
	raw?: Record<string, unknown>;
};

function parseDescriptorXml(xmlText: string): {
	friendlyName?: string;
	modelName?: string;
	raw: Record<string, unknown> | null;
} {
	try {
		const parser = new XMLParser({ ignoreAttributes: false });
		const obj = parser.parse(xmlText);
		const device = obj.root?.device ?? obj.device ?? obj;
		return {
			friendlyName: device?.friendlyName,
			modelName: device?.modelName,
			raw: obj,
		};
	} catch {
		return { raw: null };
	}
}

export function discoverSoundtouchDevices(): Promise<SoundTouchDevice[]> {
	if (Platform.OS === 'web') {
		console.log('Web environment detected, skipping device scan.');
		return Promise.resolve([]);
	}

	return new Promise((resolve) => {
		const zeroconf = new Zeroconf();
		const devices: { [id: string]: SoundTouchDevice } = {};

		zeroconf.on('resolved', async (service) => {
			if (service.name.toLowerCase().includes('soundtouch') && !devices[service.host]) {
				const device: SoundTouchDevice = {
					id: service.host,
					name: service.name,
					ip: service.addresses[0],
					port: service.port,
				};

				// Fetch descriptor for more details
				try {
					const res = await fetch(`http://${device.ip}:${device.port}/info`);
					if (res.ok) {
						const text = await res.text();
						const parsed = parseDescriptorXml(text);
						device.name = parsed.friendlyName || device.name;
						device.model = parsed.modelName;
						if (parsed.raw) {
							device.raw = parsed.raw;
						}
					}
				} catch (error) {
					console.error('Error fetching device descriptor:', error);
				}
				devices[service.host] = device;
			}
		});

		zeroconf.scan('soundtouch', 'tcp', 'local.');

		setTimeout(() => {
			zeroconf.stop();
			resolve(Object.values(devices));
		}, 5000); // Scan for 5 seconds
	});
}
