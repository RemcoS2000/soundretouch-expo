import type { SoundTouchDevice } from '@soundretouch/api/device'

import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { setImmediate, setTimeout } from 'node:timers/promises'

import { discoverSoundTouchDevices, getDiscoveryHosts } from '../src/discovery/discoverSoundTouchDevices'
import type { DiscoveryBrowser } from '../src/discovery/discoverSoundTouchDevices'
import type { SoundTouchDeviceEntry } from '../src/state/SoundTouchDevicesContext'

import { requiredAt } from './requiredAt'

class Browser extends EventEmitter implements DiscoveryBrowser {
	stopped = 0
	removed = 0
	query: string[] = []
	scan(...query: string[]) {
		this.query = query
	}
	stop() {
		this.stopped++
	}
	removeDeviceListeners() {
		this.removed++
	}
}

function entry(host: string, deviceID = 'speaker-1'): SoundTouchDeviceEntry {
	return { device: { host } as SoundTouchDevice, info: { deviceID, type: 'SoundTouch 10', name: 'Speaker' } }
}

function setup(probe: (host: string, signal?: AbortSignal) => Promise<SoundTouchDeviceEntry>, durationMs = 1000) {
	const browser = new Browser()
	const devices: SoundTouchDeviceEntry[] = []
	const errors: unknown[] = []
	let stops = 0
	const stop = discoverSoundTouchDevices({
		createBrowser: () => browser,
		probe,
		onDevice: (device) => devices.push(device),
		onError: (error) => errors.push(error),
		onStop: () => {
			stops++
		},
		durationMs,
	})
	return {
		browser,
		devices,
		errors,
		stop,
		get stops() {
			return stops
		},
	}
}

test('prefers IPv4, removes duplicate hosts and does not use unscoped link-local IPv6', () => {
	assert.deepEqual(getDiscoveryHosts({ addresses: ['fe80::1', '2001:db8::1', '192.168.1.41', '192.168.1.41'], host: 'speaker.local.' }), [
		'192.168.1.41',
		'[2001:db8::1]',
		'speaker.local',
	])
})

test('discovers the SoundTouch service and verifies candidates, deduplicating by device ID', async () => {
	const scan = setup(async (host) => entry(host))
	try {
		assert.deepEqual(scan.browser.query, ['soundtouch', 'tcp', 'local.'])
		scan.browser.emit('resolved', { addresses: ['192.168.1.41'], host: '' })
		scan.browser.emit('resolved', { addresses: ['192.168.1.41'], host: '' })
		scan.browser.emit('resolved', { addresses: ['192.168.1.42'], host: '' })
		await setImmediate()
		assert.equal(scan.devices.length, 1)
		assert.equal(requiredAt(scan.devices, 0).device.host, '192.168.1.41')
	} finally {
		scan.stop()
	}
})

test('tries another address when the first advertised endpoint is unreachable', async () => {
	const hosts: string[] = []
	const scan = setup(async (host) => {
		hosts.push(host)
		if (host === '192.168.1.40') throw new Error('unreachable')
		return entry(host)
	})
	try {
		scan.browser.emit('resolved', { addresses: ['192.168.1.40', '192.168.1.41'], host: '' })
		await setImmediate()
		assert.deepEqual(hosts, ['192.168.1.40', '192.168.1.41'])
		assert.equal(requiredAt(scan.devices, 0).device.host, '192.168.1.41')
	} finally {
		scan.stop()
	}
})

test('ignores a service whose info endpoint is not a SoundTouch speaker', async () => {
	let disposed = 0
	const scan = setup(async (host) => {
		const candidate = entry(host)
		candidate.info = { deviceID: 'printer', type: 'Printer' }
		candidate.device.dispose = () => {
			disposed++
		}

		return candidate
	})
	try {
		scan.browser.emit('resolved', { addresses: ['192.168.1.9'], host: '' })
		await setImmediate()
		assert.equal(scan.devices.length, 0)
		assert.equal(disposed, 1)
	} finally {
		scan.stop()
	}
})

test('stopping releases listeners and suppresses late HTTP responses', async () => {
	let finish!: (result: SoundTouchDeviceEntry) => void
	const scan = setup(
		() =>
			new Promise((resolve) => {
				finish = resolve
			})
	)
	scan.browser.emit('resolved', { addresses: ['192.168.1.41'], host: '' })
	await setImmediate()

	scan.stop()
	scan.stop()
	finish(entry('192.168.1.41'))
	await setImmediate()
	assert.equal(scan.devices.length, 0)
	assert.equal(scan.browser.stopped, 1)
	assert.equal(scan.browser.removed, 1)
	assert.equal(scan.browser.listenerCount('resolved'), 0)
	assert.equal(scan.stops, 1)
})

test('native scan errors stop the scan and are reported', () => {
	const scan = setup(async (host) => entry(host))
	scan.browser.emit('error', new Error('permission denied'))
	assert.equal(scan.errors.length, 1)
	assert.equal(scan.stops, 1)
	assert.equal(scan.browser.removed, 1)
})

test('listener cleanup still runs when the native stop call throws', () => {
	const scan = setup(async (host) => entry(host))
	scan.browser.stop = () => {
		throw new Error('already stopped')
	}
	assert.doesNotThrow(scan.stop)
	assert.equal(scan.browser.removed, 1)
	assert.equal(scan.stops, 1)
})

test('a missing native module is reported without crashing', () => {
	let error: unknown
	let stopped = false
	discoverSoundTouchDevices({
		createBrowser: () => {
			throw new Error('module missing')
		},
		probe: async (host) => entry(host),
		onDevice: () => assert.fail('unexpected device'),
		onError: (value) => {
			error = value
		},
		onStop: () => {
			stopped = true
		},
	})
	assert.ok(error instanceof Error)
	assert.equal(stopped, true)
})

test('scan deadline stops native discovery automatically', async () => {
	const scan = setup(async (host) => entry(host), 10)
	await setTimeout(30)
	assert.equal(scan.stops, 1)
	assert.equal(scan.browser.removed, 1)
})

test('limits concurrent verification probes to four and cancels them on stop', async () => {
	let concurrent = 0
	let maximum = 0
	const scan = setup(
		(_host, signal) =>
			new Promise((_resolve, reject) => {
				concurrent++
				maximum = Math.max(maximum, concurrent)
				signal?.addEventListener('abort', () => {
					concurrent--
					reject(new Error('cancelled'))
				})
			})
	)
	for (let i = 1; i <= 12; i++) scan.browser.emit('resolved', { addresses: [`192.168.1.${i}`], host: '' })
	await setImmediate()
	assert.equal(maximum, 4)
	scan.stop()
	await setImmediate()
	assert.equal(concurrent, 0)
})
