import { SoundTouchDevice } from '@soundretouch/api/device'

import { getSoundtouchProxyUrl, getSoundtouchWebSocketProxyUrl } from '../../utils/proxy'

import { normalizeHost } from './identity'

/**
 * Creates a speaker client with the shared HTTP timeout and live-update configuration.
 */
export function createDevice(host: string, timeoutMs = 8000) {
	const proxyUrl = getSoundtouchProxyUrl()
	const socketProxyUrl = getSoundtouchWebSocketProxyUrl()

	return new SoundTouchDevice(normalizeHost(host), {
		http: { timeoutMs, ...(proxyUrl ? { proxyUrl } : {}) },
		ws: { autoReconnect: true, connectTimeoutMs: 8000, maxReconnectDelayMs: 30000, ...(socketProxyUrl ? { proxyUrl: socketProxyUrl } : {}) },
	})
}

/**
 * Verifies an address with a four-second read-only probe. Failed or cancelled probes dispose their client.
 */
export async function probeSpeaker(host: string, signal?: AbortSignal) {
	const device = createDevice(host)
	const controller = new AbortController()
	let timedOut = false

	/**
	 * Forwards discovery cancellation to the verification request.
	 */
	const abort = () => controller.abort()

	if (signal?.aborted) {
		controller.abort()
	}

	signal?.addEventListener('abort', abort, { once: true })

	const timer = setTimeout(() => {
		timedOut = true
		controller.abort()
	}, 4000)

	try {
		const info = await device.info({ signal: controller.signal })

		if (!info.deviceID || !info.type?.toLowerCase().includes('soundtouch')) {
			throw new Error('This address does not identify a SoundTouch speaker.')
		}

		return { device, info }
	} catch (error) {
		device.dispose()

		if (timedOut) {
			throw new Error('Speaker did not respond within four seconds. Check the address and local network.')
		}

		throw error
	} finally {
		clearTimeout(timer)
		signal?.removeEventListener('abort', abort)
	}
}
