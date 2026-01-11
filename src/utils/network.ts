import * as Network from 'expo-network';
import { Platform } from 'react-native';

const FALLBACK_SUBNET = '192.168.1';

const subnetFromIp = (ip?: string | null): string | null => {
	if (!ip) return null;
	const match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/);
	if (!match) return null;
	const parts = match.slice(1, 4).map(Number);
	if (parts.some((part) => part < 0 || part > 255)) return null;
	return parts.join('.');
};

/**
 * Resolve the local network subnet used for dev host discovery.
 *
 * On web in dev mode, uses `EXPO_PUBLIC_DEV_HOST_IP_SUBNET` if provided.
 * Otherwise derives the subnet from the device IP and falls back to "192.168.1".
 */
export async function getLocalSubnet(): Promise<string> {
	if (__DEV__ && Platform.OS === 'web' && process.env.EXPO_PUBLIC_DEV_HOST_IP_SUBNET) {
		return process.env.EXPO_PUBLIC_DEV_HOST_IP_SUBNET;
	}

	const deviceIp = await Network.getIpAddressAsync();
	return subnetFromIp(deviceIp) || FALLBACK_SUBNET;
}
