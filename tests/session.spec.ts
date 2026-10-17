import type { SoundTouchDevice } from '@soundretouch/api/device'

import { type Mock, vi } from 'vitest'

import { createSession, queryClient, setSessionsForeground } from '../src/features/speakers/session'

import { deferred } from './deferred'

function setup() {
	const callbacks: Record<string, (data: unknown) => void> = {}
	const device = {
		host: '192.168.1.2',
		info: vi.fn(async () => ({ deviceID: 'AABB' })),
		nowPlaying: vi.fn(async () => ({ track: 'old' })),
		volume: vi.fn(async () => ({ actualvolume: 20 })),
		onTransportStateChanged: vi.fn((handler) => {
			handler('disconnected')
			callbacks.transport = handler
			return vi.fn()
		}),
		onNowPlayingUpdated: vi.fn((handler) => {
			callbacks.nowPlaying = handler
			return vi.fn()
		}),
		onVolumeUpdated: vi.fn((handler) => {
			callbacks.volume = handler
			return vi.fn()
		}),
		connect: vi.fn(),
		disconnect: vi.fn(),
		dispose: vi.fn(),
	} as unknown as SoundTouchDevice
	return { device, callbacks, session: createSession(device, 'AABB') }
}
afterEach(() => {
	setSessionsForeground(true, [])
	queryClient.clear()
	vi.useRealTimers()
})

test.each(['background', 'disposed'] as const)('does not send a prepared command after the session becomes %s', async (state) => {
	const { session, device } = setup()
	const info = deferred<{ deviceID: string }>()
	const started = deferred()
	const action = vi.fn(async () => {})
	;(device.info as Mock).mockImplementation(() => {
		started.resolve()

		return info.promise
	})
	const command = session.command(action)
	const rejected = expect(command).rejects.toThrow(state === 'disposed' ? 'cancelled' : 'unavailable')

	await started.promise
	if (state === 'disposed') {
		session.dispose()
	} else {
		setSessionsForeground(false, [])
	}
	info.resolve({ deviceID: 'AABB' })
	await rejected
	expect(action).not.toHaveBeenCalled()
	if (state !== 'disposed') {
		session.dispose()
	}
})

test('rechecks identity after reconciliation before sending a queued command', async () => {
	const { session, device } = setup()
	await expect(
		session.command(async () => {
			throw new Error('timeout')
		})
	).rejects.toThrow('timeout')
	const snapshot = deferred<{ track: string }>()
	const started = deferred()
	;(device.nowPlaying as Mock).mockImplementation(() => {
		started.resolve()

		return snapshot.promise
	})
	const action = vi.fn(async () => {})
	const command = session.command(action)
	const rejected = expect(command).rejects.toThrow('identity changed')

	await started.promise
	;(device.info as Mock).mockResolvedValue({ deviceID: 'CCDD' })
	await expect(session.read('info')).rejects.toThrow('identity changed')
	snapshot.resolve({ track: 'current' })
	await rejected
	expect(action).not.toHaveBeenCalled()
	session.dispose()
})
test('newer live events win over older HTTP responses', async () => {
	vi.useFakeTimers()
	const { device, callbacks, session } = setup()
	let resolve!: (value: unknown) => void
	;(device.nowPlaying as Mock).mockImplementation(
		() =>
			new Promise((done) => {
				resolve = done
			})
	)
	const release = session.retain('nowPlaying')
	const read = session.read('nowPlaying')
	const onNowPlaying = callbacks.nowPlaying
	if (!onNowPlaying) {
		throw new Error('Now Playing handler was not registered')
	}
	onNowPlaying({ track: 'new' })
	resolve({ track: 'old' })
	await expect(read).resolves.toEqual({ track: 'new' })
	release()
	expect(device.disconnect).toHaveBeenCalled()
	session.dispose()
	expect(vi.getTimerCount()).toBe(0)
})
test('retains one subscription for multiple consumers and releases on final consumer', () => {
	vi.useFakeTimers()
	const { session, device } = setup()
	const first = session.retain('volume')
	const second = session.retain('volume')
	expect(device.onVolumeUpdated).toHaveBeenCalledTimes(1)
	first()
	expect(device.disconnect).not.toHaveBeenCalled()
	second()
	expect(device.disconnect).toHaveBeenCalledTimes(1)
	session.dispose()
})
test('rejects a different speaker at a saved address', async () => {
	const { session, device } = setup()
	;(device.info as Mock).mockResolvedValue({ deviceID: 'CCDD' })
	await expect(session.read('info')).rejects.toThrow('identity changed')
	session.dispose()
})
test('serializes commands and reconciles an uncertain result before another toggle', async () => {
	const { session, device } = setup()
	let finish!: () => void
	const order: number[] = []
	let started!: () => void
	const firstStarted = new Promise<void>((resolve) => {
		started = resolve
	})
	const first = session.command(
		() =>
			new Promise((resolve) => {
				order.push(1)
				started()
				finish = resolve
			})
	)
	const second = session.command(async () => {
		order.push(2)
	})
	await firstStarted
	expect(order).toEqual([1])
	finish()
	await first
	await second
	expect(order).toEqual([1, 2])
	await expect(
		session.command(async () => {
			throw new Error('timeout')
		})
	).rejects.toThrow('timeout')
	await session.command(async () => {
		order.push(3)
	})
	expect(device.nowPlaying).toHaveBeenCalled()
	session.dispose()
})

test('cancels in-flight reads after the last consumer disappears', async () => {
	vi.useFakeTimers()
	const { device, session } = setup()
	let finish!: (data: unknown) => void
	;(device.nowPlaying as Mock).mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve
			})
	)
	const release = session.retain('nowPlaying')
	const pending = session.read('nowPlaying')
	release()
	finish({ track: 'late' })
	await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
	session.dispose()
	expect(vi.getTimerCount()).toBe(0)
})

test('blocks controls after detecting a different speaker, and does not replay an ambiguous toggle', async () => {
	const { session, device } = setup()
	const action = vi.fn(async () => {})
	;(device.info as Mock).mockResolvedValue({ deviceID: 'CCDD' })
	await expect(session.read('info')).rejects.toThrow('identity changed')
	await expect(session.command(action)).rejects.toThrow('identity changed')
	expect(action).not.toHaveBeenCalled()
	session.dispose()
	const other = setup()
	await expect(
		other.session.command(async () => {
			throw new Error('timeout')
		})
	).rejects.toThrow('timeout')
	await expect(other.session.command(action, ['nowPlaying'], { relative: true })).rejects.toThrow('tap again')
	expect(action).not.toHaveBeenCalled()
	await other.session.command(action, ['nowPlaying'], { relative: true })
	expect(action).toHaveBeenCalledTimes(1)
	other.session.dispose()
})
