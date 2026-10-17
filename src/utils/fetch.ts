import { fetch as expoFetch, type FetchRequestInit } from 'expo/fetch'

import { getSoundtouchProxyUrl } from './proxy'

/**
 * Optional local bridge, shared with the device client configuration.
 */
export async function fetch(url: string, init?: FetchRequestInit): Promise<Response> {
	const proxy = getSoundtouchProxyUrl()

	return expoFetch(proxy ? `${proxy}${encodeURIComponent(url)}` : url, init)
}
