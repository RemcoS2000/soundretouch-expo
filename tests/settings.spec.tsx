import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, renderHook, waitFor } from '@testing-library/react-native'

import { AccessibilityInfo } from 'react-native'
import { vi } from 'vitest'

import { AppSettingsProvider, useAppSettings } from '../src/state/AppSettingsContext'

import { deferred } from './deferred'

afterEach(() => {
	vi.restoreAllMocks()
	vi.clearAllMocks()
})

test('late stored appearance never overwrites an explicit choice and changes are saved in order', async () => {
	const restore = deferred<string | null>()
	vi.spyOn(AsyncStorage, 'getItem').mockReturnValue(restore.promise)
	const { result } = await renderHook(useAppSettings, { wrapper: AppSettingsProvider })
	await act(() => result.current.setMode('dark'))
	await act(() => restore.resolve('light'))
	expect(result.current.mode).toBe('dark')
	await act(() => result.current.toggleDarkMode())
	expect(result.current.mode).toBe('light')
	await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('soundretouch:theme-mode', 'light'))
})

test('appearance write failures are visible and a later choice recovers', async () => {
	vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue('dark')
	vi.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined)
	const { result } = await renderHook(useAppSettings, { wrapper: AppSettingsProvider })
	await waitFor(() => expect(result.current.mode).toBe('dark'))
	await act(() => result.current.setMode('light'))
	await waitFor(() => expect(result.current.settingsError).toMatch(/Could not save/))
	await act(() => result.current.setMode('dark'))
	await waitFor(() => expect(result.current.settingsError).toBeNull())
})

test('read failures retain defaults and reduced motion updates remain observable', async () => {
	vi.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('storage unavailable'))
	vi.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
	const motion = vi.spyOn(AccessibilityInfo, 'addEventListener')
	const { result, unmount } = await renderHook(useAppSettings, { wrapper: AppSettingsProvider })
	await waitFor(() => expect(result.current.settingsError).toMatch(/Could not read/))
	expect(result.current.mode).toBe('system')
	expect(result.current.reducedMotion).toBe(true)
	const change = motion.mock.calls.find(([event]) => event === 'reduceMotionChanged')?.[1]
	await act(() => change?.(false))
	expect(result.current.reducedMotion).toBe(false)
	await unmount()
})
