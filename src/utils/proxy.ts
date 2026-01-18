import { Platform } from 'react-native';

const DEFAULT_PROXY_BASE = 'http://localhost';
const DEFAULT_PROXY_PORT = '4100';
const DEFAULT_PROXY_PATH = '/proxy?url=';

export function getSoundtouchProxyUrl(): string | undefined {
	if (Platform.OS !== 'web') return undefined;
	if (process.env.EXPO_PUBLIC_USE_DEV_PROXY !== 'true') return undefined;

	const explicit = process.env.EXPO_PUBLIC_SOUNDTOUCH_PROXY_URL;
	if (explicit) return explicit;

	const base = (
		process.env.EXPO_PUBLIC_SOUNDTOUCH_PROXY_BASE_URL ||
		process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
		DEFAULT_PROXY_BASE
	).replace(/\/+$/, '');
	const port = process.env.EXPO_PUBLIC_SOUNDTOUCH_PROXY_PORT || process.env.EXPO_PUBLIC_PROXY_PORT || DEFAULT_PROXY_PORT;
	const path = process.env.EXPO_PUBLIC_SOUNDTOUCH_PROXY_PATH || DEFAULT_PROXY_PATH;
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;

	return `${base}:${port}${normalizedPath}`;
}
