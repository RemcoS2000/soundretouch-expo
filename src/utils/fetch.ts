import { fetch as expoFetch, FetchRequestInit } from 'expo/fetch'
import { Platform } from 'react-native'

const DEFAULT_PROXY_BASE = process.env.EXPO_PUBLIC_PROXY_BASE_URL || 'http://localhost'
const PROXY_PORT = process.env.EXPO_PUBLIC_PROXY_PORT || '4041'
const USE_DEV_PROXY = process.env.EXPO_PUBLIC_USE_DEV_PROXY === 'true'

export function devProxyEnabled(): boolean {
	return __DEV__ && USE_DEV_PROXY && Platform.OS === 'web'
}

export function getDevProxyBaseUrl(): string {
	const base = DEFAULT_PROXY_BASE.replace(/\/+$/, '')
	return `${base}:${PROXY_PORT}`
}

export function getDevProxyUrl(url: string): string {
	return `${getDevProxyBaseUrl()}/proxy?url=${encodeURIComponent(url)}`
}

/**
 * A simple Fetch wrapper.
 *
 * On web in dev mode, routes requests through the local proxy to avoid CORS.
 */
export async function fetch(url: string, init?: FetchRequestInit): Promise<Response> {
	if (devProxyEnabled()) {
		const devProxyUrl = getDevProxyUrl(url)
		return expoFetch(devProxyUrl, init)
	}

	return expoFetch(url, init)
}
