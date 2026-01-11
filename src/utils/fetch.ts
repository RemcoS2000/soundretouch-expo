import { Platform } from 'react-native';
import { fetch as expoFetch, FetchRequestInit } from 'expo/fetch';
import { log } from './logger';

const DEFAULT_PROXY_BASE = 'http://localhost:4041';

function getDevProxyUrl(url: string): string {
	const base = DEFAULT_PROXY_BASE.replace(/\/+$/, '');
	return `${base}/proxy?url=${encodeURIComponent(url)}`;
}

/**
 * A simple Fetch wrapper.
 *
 * On web in dev mode, routes requests through the local proxy to avoid CORS.
 */
export async function fetch(url: string, init?: FetchRequestInit): Promise<Response> {
	if (__DEV__ && Platform.OS === 'web') {
		log.debug('Using dev proxy for fetch:', url);
		return expoFetch(getDevProxyUrl(url), init);
	}

	return expoFetch(url, init);
}
