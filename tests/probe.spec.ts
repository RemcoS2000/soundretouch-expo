import { SoundTouchDevice } from '@soundretouch/api/device'

import { vi } from 'vitest'

import { probeSpeaker } from '../src/features/speakers/client'

const { mockInfo } = vi.hoisted(() => ({ mockInfo: vi.fn() }))
const { mockDispose } = vi.hoisted(() => ({ mockDispose: vi.fn() }))
vi.mock('@soundretouch/api/device', () => ({
	SoundTouchDevice: vi.fn(function () {
		return { info: mockInfo, dispose: mockDispose }
	}),
}))
afterEach(() => {
	vi.clearAllMocks()
	vi.useRealTimers()
})
test('adopts a normal eight-second client while bounding verification to four seconds', async () => {
	mockInfo.mockResolvedValue({ deviceID: 'AABB', type: 'SoundTouch 10' })
	const entry = await probeSpeaker('speaker.local')
	expect(entry.info.deviceID).toBe('AABB')
	expect(SoundTouchDevice).toHaveBeenCalledWith('speaker.local', expect.objectContaining({ http: expect.objectContaining({ timeoutMs: 8000 }) }))
	expect(mockDispose).not.toHaveBeenCalled()
})
test('cancels a hung probe at four seconds and disposes its client', async () => {
	vi.useFakeTimers()
	mockInfo.mockImplementation(({ signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))))
	const result = probeSpeaker('speaker.local')
	const rejection = expect(result).rejects.toThrow('four seconds')
	await vi.advanceTimersByTimeAsync(4000)
	await rejection
	expect(mockDispose).toHaveBeenCalledTimes(1)
	expect(vi.getTimerCount()).toBe(0)
})
test('caller cancellation does not become a timeout', async () => {
	mockInfo.mockImplementation(({ signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled')))))
	const controller = new AbortController()
	const result = probeSpeaker('speaker.local', controller.signal)
	controller.abort()
	await expect(result).rejects.toThrow('cancelled')
	expect(mockDispose).toHaveBeenCalledTimes(1)
})
