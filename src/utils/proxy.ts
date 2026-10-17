import { Platform } from 'react-native'

/**
 * Resolves the optional local development HTTP bridge on web; native connects directly.
 */
export function getSoundtouchProxyUrl(): string | undefined {
	if (Platform.OS !== 'web') {
		return undefined
	}

	if (process.env.EXPO_PUBLIC_USE_DEV_PROXY === 'false') {
		return undefined
	}

	const explicit: unknown = process.env.EXPO_PUBLIC_SOUNDTOUCH_PROXY_URL

	if (typeof explicit === 'string' && explicit) {
		return explicit
	}

	if (typeof window !== 'undefined' && !__DEV__) {
		return `${window.location.origin}/proxy?url=`
	}

	const configuredBase: unknown = process.env.EXPO_PUBLIC_PROXY_BASE_URL
	const base = (typeof configuredBase === 'string' && configuredBase ? configuredBase : 'http://localhost').replace(/\/+$/, '')

	return `${base}:${process.env.EXPO_PUBLIC_PROXY_PORT || '4100'}/proxy?url=`
}

/**
 * Uses the same local development origin for live speaker updates on web.
 */
export function getSoundtouchWebSocketProxyUrl(): string | undefined {
	return getSoundtouchProxyUrl()?.replace(/^http/, 'ws')
}
