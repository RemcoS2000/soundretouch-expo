import type { SoundTouchDevice } from '@soundretouch/api/device'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'

import { useIsFocused } from 'expo-router'
import React from 'react'
import { type Mock, vi } from 'vitest'

import { useSpeakerResource } from '../src/features/speakers/queries'
import { queryClient, registerSession } from '../src/features/speakers/session'
import { useSoundTouchDevices } from '../src/state/SoundTouchDevicesContext'

vi.mock('expo-router', () => ({ useIsFocused: vi.fn() }))
vi.mock('../src/state/SoundTouchDevicesContext', () => ({ useSoundTouchDevices: vi.fn() }))

/** Shares the same resource cache as the provider-owned speaker sessions. */
function wrapper({ children }: { children: React.ReactNode }) {
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

/** Provides volume snapshots and subscriptions without opening network connections. */
function setup() {
	const device = {
		volume: vi.fn(async () => ({ actualvolume: 25 })),
		onVolumeUpdated: vi.fn(() => vi.fn()),
		onTransportStateChanged: vi.fn(() => vi.fn()),
		connect: vi.fn(),
		disconnect: vi.fn(),
		dispose: vi.fn(),
	} as unknown as SoundTouchDevice

	return { device, session: registerSession(device, 'AABB') }
}

beforeEach(() => {
	vi.mocked(useIsFocused).mockReturnValue(true)
	;(useSoundTouchDevices as Mock).mockReturnValue({ foreground: true })
})

afterEach(() => queryClient.clear())

test('deduplicates reads and subscriptions for consumers of the same speaker resource', async () => {
	const { device, session } = setup()
	const { result, unmount } = await renderHook(() => ({ first: useSpeakerResource(device, 'volume'), second: useSpeakerResource(device, 'volume') }), {
		wrapper,
	})

	try {
		await waitFor(() => expect(result.current.first.isSuccess && result.current.second.isSuccess).toBe(true))
		expect(result.current.first.data?.actualvolume).toBe(25)
		expect(result.current.second.data).toBe(result.current.first.data)
		expect(device.volume).toHaveBeenCalledTimes(1)
		expect(device.onVolumeUpdated).toHaveBeenCalledTimes(1)
	} finally {
		await unmount()
		session.dispose()
	}
})

test.each(['unselected', 'unfocused', 'background', 'undemanded'] as const)('does not start speaker work when %s', async (state) => {
	const { device, session } = setup()
	vi.mocked(useIsFocused).mockReturnValue(state !== 'unfocused')
	;(useSoundTouchDevices as Mock).mockReturnValue({ foreground: state !== 'background' })
	const { result, unmount } = await renderHook(() => useSpeakerResource(state === 'unselected' ? null : device, 'volume', state !== 'undemanded'), {
		wrapper,
	})

	try {
		expect(result.current.fetchStatus).toBe('idle')
		expect(device.volume).not.toHaveBeenCalled()
		expect(device.connect).not.toHaveBeenCalled()
		expect(device.onVolumeUpdated).not.toHaveBeenCalled()
	} finally {
		await unmount()
		session.dispose()
	}
})
