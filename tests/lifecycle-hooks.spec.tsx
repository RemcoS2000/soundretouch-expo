import type { SoundTouchDevice } from '@soundretouch/api/device'
import { act, renderHook } from '@testing-library/react-native'

import * as Network from 'expo-network'
import { useIsFocused } from 'expo-router'
import React from 'react'
import { AppState } from 'react-native'
import { vi } from 'vitest'

import { discoverSoundTouchDevices } from '../src/discovery/discoverSoundTouchDevices'
import { usePlaybackProgress } from '../src/features/player/usePlaybackProgress'
import { useSpeakerMenu } from '../src/features/player/useSpeakerMenu'
import { setSessionsForeground } from '../src/features/speakers/session'
import { useDeviceDiscovery } from '../src/hooks/useDeviceDiscovery'
import { useSpeakerLifecycle } from '../src/state/useSpeakerLifecycle'

const { mockRouter } = vi.hoisted(() => ({ mockRouter: { setParams: vi.fn() } }))
let { mockForeground } = vi.hoisted(() => ({ mockForeground: true }))
let mockOptions: Parameters<typeof discoverSoundTouchDevices>[0]
const { mockStop } = vi.hoisted(() => ({ mockStop: vi.fn(() => mockOptions.onStop()) }))

vi.mock('expo-router', () => ({
	useIsFocused: vi.fn(() => true),
	useRouter: () => mockRouter,
	useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
}))
vi.mock('../src/state/SoundTouchDevicesContext', () => ({ useSoundTouchDevices: () => ({ foreground: mockForeground }) }))
vi.mock('../src/features/speakers/session', () => ({ setSessionsForeground: vi.fn() }))
vi.mock('../src/discovery/zeroconf', () => ({ isDiscoverySupported: true, createDiscoveryBrowser: vi.fn() }))
vi.mock('../src/discovery/discoverSoundTouchDevices', () => ({
	discoverSoundTouchDevices: vi.fn((options) => {
		mockOptions = options
		return mockStop
	}),
}))
vi.mock('../src/features/speakers/client', () => ({ probeSpeaker: vi.fn() }))

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(useIsFocused).mockReturnValue(true)
	mockForeground = true
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

test('playback progress advances by timestamps, caps at duration and releases its timer', async () => {
	vi.useFakeTimers()
	vi.setSystemTime(10000)
	const { result, rerender, unmount } = await renderHook(
		({ playing }: { playing: boolean }) =>
			usePlaybackProgress({ time: { elapsed: 8, total: 10 }, playStatus: playing ? 'PLAY_STATE' : 'PAUSE_STATE' }, 10000),
		{ initialProps: { playing: true } }
	)
	await act(() => vi.advanceTimersByTime(5000))
	expect(result.current.elapsed).toBe(10)
	await act(() => result.current.setSeekPreview(3))
	expect(result.current.seekPreview).toBe(3)
	await rerender({ playing: false })
	expect(result.current.elapsed).toBe(8)
	await act(() => vi.advanceTimersByTime(5000))
	expect(result.current.elapsed).toBe(8)
	await unmount()
})

test('inactive progress does not interpolate in the background or without focus', async () => {
	vi.useFakeTimers()
	const interval = vi.spyOn(globalThis, 'setInterval')
	mockForeground = false
	vi.mocked(useIsFocused).mockReturnValue(false)
	const { result, unmount } = await renderHook(() => usePlaybackProgress(undefined, Date.now()))
	expect(result.current.total).toBe(0)
	expect(result.current.elapsed).toBe(0)
	expect(interval).not.toHaveBeenCalled()
	await unmount()
})

test('speaker menu handles route requests and closes without navigating away', async () => {
	const { result, rerender, unmount } = await renderHook(({ requested }: { requested: boolean }) => useSpeakerMenu(requested), {
		initialProps: { requested: true },
	})
	expect(result.current.open).toBe(true)
	expect(mockRouter.setParams).toHaveBeenCalledWith({ speakers: undefined })
	await act(() => result.current.close())
	expect(result.current.open).toBe(false)
	await rerender({ requested: false })
	await rerender({ requested: true })
	expect(result.current.open).toBe(true)
	await unmount()
})

test('discovery reports results and errors, and ignores callbacks from an older scan', async () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
	const { result, unmount } = await renderHook(useDeviceDiscovery)
	await act(() => result.current.start())
	const first = mockOptions
	const entry = { device: { host: 'fixture.invalid' } as SoundTouchDevice, info: { deviceID: 'AABB' } }
	await act(() => first.onDevice(entry))
	expect(result.current.results).toEqual([entry])
	await act(() => result.current.start())
	await act(() => {
		first.onDevice(entry)
		first.onError(new Error('old error'))
		first.onStop()
	})
	expect(result.current.results).toEqual([])
	expect(result.current.status).toBe('scanning')
	await act(() => mockOptions.onError(new Error('Permission denied')))
	expect(result.current.status).toBe('error')
	expect(warn).toHaveBeenCalled()
	await unmount()
	expect(mockStop).toHaveBeenCalled()
})

test('discovery stops on background and cancels its session when the screen loses focus', async () => {
	const app = vi.spyOn(AppState, 'addEventListener')
	const { result, rerender, unmount } = await renderHook(useDeviceDiscovery)
	await act(() => result.current.start())
	const change = app.mock.calls.find(([event]) => event === 'change')?.[1]
	await act(() => change?.('background'))
	expect(mockStop).toHaveBeenCalled()
	vi.mocked(useIsFocused).mockReturnValue(false)
	await rerender(undefined)
	await unmount()
})

test('LAN lifecycle restarts sessions on network changes without requiring internet reachability', async () => {
	const device = {} as SoundTouchDevice
	const devices = { current: [{ device }] }
	const app = vi.spyOn(AppState, 'addEventListener')
	const { result, unmount } = await renderHook(() => useSpeakerLifecycle(devices))
	const change = app.mock.calls.find(([event]) => event === 'change')?.[1]
	await act(() => change?.('background'))
	expect(result.current).toBe(false)
	expect(setSessionsForeground).toHaveBeenLastCalledWith(false, [device])
	await act(() => change?.('active'))
	expect(result.current).toBe(true)
	const network = vi.mocked(Network.addNetworkStateListener).mock.calls.at(-1)?.[0]
	const currentState = AppState.currentState
	Object.defineProperty(AppState, 'currentState', { configurable: true, writable: true, value: 'active' })
	await act(() => network?.({ isConnected: true, isInternetReachable: false, type: 'WIFI' as Network.NetworkStateType }))
	expect(setSessionsForeground).toHaveBeenLastCalledWith(true, [device])
	Object.defineProperty(AppState, 'currentState', { configurable: true, writable: true, value: currentState })
	await unmount()
})
