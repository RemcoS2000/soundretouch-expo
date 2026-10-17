import type { Service } from 'react-native-zeroconf'

import type { SoundTouchDeviceEntry } from '../state/SoundTouchDevicesContext'
import { reportAsync } from '../utils/async'

export type DiscoveryService = Pick<Service, 'addresses' | 'host'>

export interface DiscoveryBrowser {
	on(event: 'resolved', listener: (service: DiscoveryService) => void): unknown
	on(event: 'error', listener: (error: unknown) => void): unknown
	scan(type: string, protocol: string, domain: string): void
	stop(): void
	removeDeviceListeners(): void
	removeAllListeners(): unknown
}

interface DiscoveryOptions {
	createBrowser: () => DiscoveryBrowser
	probe: (host: string, signal?: AbortSignal) => Promise<SoundTouchDeviceEntry>
	onDevice: (entry: SoundTouchDeviceEntry) => void
	onError: (error: unknown) => void
	onStop: () => void
	durationMs?: number
}

/**
 * Orders usable discovery addresses with IPv4 first, followed by IPv6 and the hostname.
 * SoundTouch commonly also advertises a link-local IPv6 address that cannot be used directly.
 */
export function getDiscoveryHosts(service: DiscoveryService): string[] {
	const addresses = service.addresses ?? []
	const ipv4 = addresses.filter((address) => /^\d+\.\d+\.\d+\.\d+$/.test(address))
	const ipv6 = addresses.filter((address) => address.includes(':') && !/^fe80:/i.test(address)).map((address) => `[${address}]`)
	const hostname = service.host?.replace(/\.$/, '')

	return [...new Set([...ipv4, ...ipv6, ...(hostname ? [hostname] : [])])]
}

/**
 * Verifies discovered speakers with at most four concurrent probes and deduplicates their IDs.
 *
 * @returns A function that cancels pending probes and releases browser listeners.
 */
export function discoverSoundTouchDevices({ createBrowser, probe, onDevice, onError, onStop, durationMs = 20000 }: DiscoveryOptions): () => void {
	let active = true
	let browser: DiscoveryBrowser | undefined
	let timer: ReturnType<typeof setTimeout> | undefined
	const pending = new Set<string>()
	const verifiedHosts = new Set<string>()
	const deviceIDs = new Set<string>()
	const controller = new AbortController()
	const pool = createProbePool()

	/**
	 * Stops the scan once and cancels both waiting and active probes.
	 */
	const stop = () => {
		if (!active) {
			return
		}

		active = false
		controller.abort()
		pool.cancelWaiting()
		clearTimeout(timer)

		// Keep the error listener during stop: the native module can emit synchronously.
		try {
			browser?.stop()
		} catch {
			// A failed or already-stopped native scan still needs listener cleanup.
		} finally {
			browser?.removeDeviceListeners()
			browser?.removeAllListeners()
			onStop()
		}
	}

	/**
	 * Stops discovery and reports failures only while this scan is active.
	 */
	const fail = (error: unknown) => {
		if (!active) {
			return
		}

		stop()
		onError(error)
	}

	/**
	 * Holds a verification slot only while a live scan is probing its candidate.
	 */
	const probeCandidate = async (host: string): Promise<SoundTouchDeviceEntry | undefined> => {
		await pool.acquire()
		try {
			if (!active) {
				return undefined
			}

			return await probe(host, controller.signal)
		} finally {
			pool.release()
		}
	}

	/**
	 * Tries the advertised addresses until one confirms a SoundTouch device.
	 */
	const resolve = async (service: DiscoveryService) => {
		for (const host of getDiscoveryHosts(service)) {
			if (!active || verifiedHosts.has(host)) {
				return
			}

			if (pending.has(host)) {
				continue
			}

			pending.add(host)

			try {
				const entry = await probeCandidate(host)

				if (!entry) {
					return
				}

				if (acceptCandidate(entry, host, { active, verifiedHosts, deviceIDs, onDevice }) === 'done') {
					return
				}
			} catch {
				// Try another advertised address if this one is unreachable.
			} finally {
				pending.delete(host)
			}
		}
	}

	try {
		browser = createBrowser()
		browser.on('resolved', (service) => reportAsync(resolve(service)))
		browser.on('error', fail)
		timer = setTimeout(stop, durationMs)
		browser.scan('soundtouch', 'tcp', 'local.')
	} catch (error) {
		fail(error)
	}

	return stop
}

/**
 * Accepts only verified SoundTouch metadata and returns its canonical identity.
 */
function verifiedDeviceID(entry: SoundTouchDeviceEntry): string | undefined {
	if (!entry.info?.type?.toLowerCase().includes('soundtouch')) {
		return undefined
	}

	return entry.info.deviceID?.replace(/[:-]/g, '').toUpperCase() || undefined
}

/** Transfers bounded probe slots and wakes waiting work when discovery stops. */
function createProbePool() {
	const queue: (() => void)[] = []
	let running = 0

	/**
	 * Waits for a probe slot without starting additional network work.
	 */
	const acquire = () =>
		new Promise<void>((resolve) => {
			if (running < 4) {
				running++
				resolve()
			} else {
				queue.push(resolve)
			}
		})

	/**
	 * Transfers a released probe slot to the next waiting address, if any.
	 */
	const release = () => {
		const next = queue.shift()

		if (next) {
			next()
		} else {
			running--
		}
	}

	return { acquire, release, cancelWaiting: () => queue.splice(0).forEach((next) => next()) }
}

type Acceptance = {
	active: boolean
	verifiedHosts: Set<string>
	deviceIDs: Set<string>
	onDevice: DiscoveryOptions['onDevice']
}

/** Publishes a confirmed identity once and disposes results the scan no longer owns. */
function acceptCandidate(entry: SoundTouchDeviceEntry, host: string, { active, verifiedHosts, deviceIDs, onDevice }: Acceptance): 'done' | 'try-next-address' {
	if (!active) {
		entry.device.dispose?.()

		return 'done'
	}
	const deviceID = verifiedDeviceID(entry)

	if (!deviceID) {
		entry.device.dispose?.()

		return 'try-next-address'
	}
	verifiedHosts.add(host)
	if (!deviceIDs.has(deviceID)) {
		deviceIDs.add(deviceID)
		onDevice(entry)
	} else {
		entry.device.dispose?.()
	}

	return 'done'
}
