import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, renderHook, waitFor } from '@testing-library/react-native'

import React from 'react'
import { vi } from 'vitest'

import { ActiveSpeakerProvider, useActiveSpeaker } from '../src/state/ActiveSpeakerContext'
import { SoundTouchDevicesProvider, useSoundTouchDevices } from '../src/state/SoundTouchDevicesContext'

function wrapper({ children }: { children: React.ReactNode }) {
	return (
		<SoundTouchDevicesProvider>
			<ActiveSpeakerProvider>{children}</ActiveSpeakerProvider>
		</SoundTouchDevicesProvider>
	)
}
afterEach(() => {
	vi.restoreAllMocks()
	vi.clearAllMocks()
})
test('keeps the selected speaker across navigation and falls back after removal', async () => {
	vi.spyOn(AsyncStorage, 'getItem').mockResolvedValue(
		JSON.stringify({
			version: 2,
			devices: [
				{ host: '192.168.1.2', info: { deviceID: 'AABB' } },
				{ host: '192.168.1.3', info: { deviceID: 'CCDD' } },
			],
		})
	)
	const { result } = await renderHook(() => ({ ...useActiveSpeaker(), ...useSoundTouchDevices() }), { wrapper })
	await waitFor(() => expect(result.current.hydrated).toBe(true))
	expect(result.current.activeId).toBe('AABB')
	await act(() => result.current.selectSpeaker('CCDD'))
	expect(result.current.activeId).toBe('CCDD')
	await act(() => result.current.removeDevice('192.168.1.3'))
	expect(result.current.activeId).toBe('AABB')
})
