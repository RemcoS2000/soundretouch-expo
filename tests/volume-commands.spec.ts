import type { SoundTouchDevice } from '@soundretouch/api/device'

import { type Mock, vi } from 'vitest'

import { setSpeakerVolume } from '../src/features/speakers/commands'
import { queryClient, registerSession } from '../src/features/speakers/session'

import { deferred } from './deferred'

/** Creates an isolated device with controllable command timing and no network transport. */
function setup(id = 'AABB') {
	const device = {
		info: vi.fn(async () => ({ deviceID: id })),
		volume: vi.fn(async () => ({ actualvolume: 20 })),
		setVolume: vi.fn(async (_value: number, _relative: boolean) => {}),
		dispose: vi.fn(),
		disconnect: vi.fn(),
	} as unknown as SoundTouchDevice

	return { device, session: registerSession(device, id) }
}

afterEach(() => queryClient.clear())

test('coalesces waiting volume requests while keeping each speaker independent', async () => {
	const first = setup()
	const second = setup('CCDD')
	const active = deferred()
	const started = deferred()
	const blocking = first.session.command(async () => {
		started.resolve()
		await active.promise
	}, [])
	await started.promise

	const waiting = setSpeakerVolume(first.device, 25)
	expect(setSpeakerVolume(first.device, 30)).toBe(waiting)
	expect(setSpeakerVolume(first.device, 35)).toBe(waiting)
	await setSpeakerVolume(second.device, 15)
	expect(first.device.setVolume).not.toHaveBeenCalled()
	expect(second.device.setVolume).toHaveBeenCalledWith(15, false)

	active.resolve()
	await blocking
	await waiting
	expect(first.device.setVolume).toHaveBeenCalledTimes(1)
	expect(first.device.setVolume).toHaveBeenCalledWith(35, false)
	first.session.dispose()
	second.session.dispose()
})

test('keeps an in-flight volume request and coalesces only the next waiting value', async () => {
	const { device, session } = setup()
	const active = deferred()
	const started = deferred()
	;(device.setVolume as Mock).mockImplementationOnce(() => {
		started.resolve()

		return active.promise
	})
	const first = setSpeakerVolume(device, 25)
	await started.promise

	const next = setSpeakerVolume(device, 30)
	expect(next).not.toBe(first)
	expect(setSpeakerVolume(device, 35)).toBe(next)
	active.resolve()
	await Promise.all([first, next])
	expect(device.setVolume).toHaveBeenNthCalledWith(1, 25, false)
	expect(device.setVolume).toHaveBeenNthCalledWith(2, 35, false)
	session.dispose()
})

test('clears failed waiting requests so a later volume update can recover', async () => {
	const { device, session } = setup()
	;(device.info as Mock).mockRejectedValueOnce(new Error('Speaker unavailable'))
	await expect(setSpeakerVolume(device, 25)).rejects.toThrow('Speaker unavailable')
	expect(device.setVolume).not.toHaveBeenCalled()
	await setSpeakerVolume(device, 30)
	expect(device.setVolume).toHaveBeenCalledWith(30, false)
	session.dispose()
})
