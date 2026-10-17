import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, renderHook, waitFor } from '@testing-library/react-native'

import { vi } from 'vitest'

import { createDevice } from '../src/features/speakers/client'
import { SoundTouchDevicesProvider, useSoundTouchDevices } from '../src/state/SoundTouchDevicesContext'

import { deferred } from './deferred'
import { requiredAt } from './requiredAt'

afterEach(() => {
	vi.restoreAllMocks()
	vi.clearAllMocks()
})
test('hydrates legacy records before enabling mutations and retains the legacy recovery key', async () => {
	let restore!: (value: string | null) => void
	const stored = new Promise<string | null>((resolve) => {
		restore = resolve
	})

	vi.spyOn(AsyncStorage, 'getItem').mockImplementation((key) => {
		if (key === 'soundtouch-devices-v2') {
			return stored
		}

		return Promise.resolve(JSON.stringify([{ host: '192.168.1.2', info: { deviceID: 'AABB', name: 'Office' } }]))
	})
	const { result } = await renderHook(useSoundTouchDevices, { wrapper: SoundTouchDevicesProvider })
	expect(result.current.hydrated).toBe(false)
	await act(() => restore(null))
	await waitFor(() => expect(result.current.hydrated).toBe(true))
	expect(result.current.devices).toHaveLength(1)
	await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('soundtouch-devices-v2', expect.stringContaining('"version":2')))
	expect(AsyncStorage.removeItem).not.toHaveBeenCalled()
})
test('reconciles a changed host for the same identity and rejects a different speaker at a saved host', async () => {
	vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue(null)
	const { result } = await renderHook(useSoundTouchDevices, { wrapper: SoundTouchDevicesProvider })
	await waitFor(() => expect(result.current.hydrated).toBe(true))
	await act(() => result.current.addDevice({ device: createDevice('192.168.1.2'), info: { deviceID: 'aa:bb' } }))
	const first = requiredAt(result.current.devices, 0).device
	const dispose = vi.spyOn(first, 'dispose')
	await act(() => result.current.addDevice({ device: createDevice('192.168.1.3'), info: { deviceID: 'AABB' } }))
	expect(dispose).toHaveBeenCalled()
	expect(result.current.devices).toHaveLength(1)
	expect(requiredAt(result.current.devices, 0).device.host).toBe('192.168.1.3')
	await act(() => result.current.addDevice({ device: createDevice('192.168.1.3'), info: { deviceID: 'CCDD' } }))
	expect(requiredAt(result.current.devices, 0).info?.deviceID).toBe('AABB')
	expect(result.current.error).toContain('different speaker')
})
test('does not overwrite unreadable storage and supports retry', async () => {
	vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue('malformed json')
	const { result } = await renderHook(useSoundTouchDevices, { wrapper: SoundTouchDevicesProvider })
	await waitFor(() => expect(result.current.error).toContain('Could not read'))
	expect(AsyncStorage.setItem).not.toHaveBeenCalled()
	vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue(null)
	await act(() => result.current.retryStorage())
	await waitFor(() => expect(result.current.error).toBeNull())
})

test('write failures retain the current registry and retry the same saved list', async () => {
	vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue(null)
	vi.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined)
	const { result } = await renderHook(useSoundTouchDevices, { wrapper: SoundTouchDevicesProvider })
	await waitFor(() => expect(result.current.error).toContain('Could not save speakers'))
	await act(() => result.current.retryStorage())
	await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2))
	expect(result.current.error).toBeNull()
	expect(result.current.devices).toEqual([])
})

test('serializes writes so a pending empty restore cannot overwrite a newer added speaker', async () => {
	vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue(null)
	const firstWrite = deferred()
	vi.spyOn(AsyncStorage, 'setItem')
		.mockImplementationOnce(() => firstWrite.promise)
		.mockResolvedValue(undefined)
	const { result } = await renderHook(useSoundTouchDevices, { wrapper: SoundTouchDevicesProvider })
	await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1))
	await act(() => result.current.addDevice({ device: createDevice('192.0.2.2'), info: { deviceID: 'AABB' } }))
	expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1)
	await act(() => firstWrite.resolve())
	await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('soundtouch-devices-v2', expect.stringContaining('AABB')))
	await act(() => result.current.removeDevice('192.0.2.2'))
	expect(result.current.devices).toEqual([])
	await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('soundtouch-devices-v2', '{"version":2,"devices":[]}'))
})

test.each(['resolve', 'reject'] as const)('ignores an older hydration that finishes with %s after a retry succeeds', async (outcome) => {
	const older = deferred<string | null>()
	const newer = deferred<string | null>()
	vi.spyOn(AsyncStorage, 'getItem')
		.mockImplementationOnce(() => older.promise)
		.mockImplementationOnce(() => newer.promise)
	const { result } = await renderHook(useSoundTouchDevices, { wrapper: SoundTouchDevicesProvider })

	await act(() => result.current.retryStorage())
	await act(() => newer.resolve(JSON.stringify([{ host: '192.168.1.3', info: { deviceID: 'CCDD', name: 'Current' } }])))
	await waitFor(() => expect(result.current.hydrated).toBe(true))
	const restoredDevice = requiredAt(result.current.devices, 0).device
	const disposed = vi.spyOn(restoredDevice, 'dispose')

	await act(() => {
		if (outcome === 'resolve') {
			older.resolve(JSON.stringify([{ host: '192.168.1.2', info: { deviceID: 'AABB', name: 'Old' } }]))
		} else {
			older.reject(new Error('Earlier storage read failed'))
		}
	})
	expect(requiredAt(result.current.devices, 0).device).toBe(restoredDevice)
	expect(disposed).not.toHaveBeenCalled()
	expect(result.current.error).toBeNull()

	await act(() => result.current.addDevice({ device: createDevice('192.168.1.4'), info: { deviceID: 'EEFF' } }))
	expect(result.current.devices).toHaveLength(2)
})
