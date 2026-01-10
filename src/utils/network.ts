import * as Network from 'expo-network';

/**
 * Get local subnet from device IP
 */
export async function getLocalSubnet(): Promise<string> {
	try {
		const ip = await Network.getIpAddressAsync();
		if (!ip) return '192.168.1';

		const parts = ip.split('.');
		if (parts.length !== 4) return '192.168.1';
		return `${parts[0]}.${parts[1]}.${parts[2]}`;
	} catch (err) {
		console.error('Failed to get local IP:', err);
		return '192.168.1';
	}
}
