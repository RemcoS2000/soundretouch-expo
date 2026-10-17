import type { SoundTouchDevice } from '@soundretouch/api/device'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'

import React from 'react'
import { vi } from 'vitest'

import { useSpeakerCommand } from '../src/features/speakers/commands'

import { deferred } from './deferred'

vi.mock('../src/features/speakers/session', () => ({
	getSession: () => ({ command: (action: () => Promise<void>) => action() }),
}))

test('tracks each pressed control until its own command settles', async () => {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } })
	const next = deferred()
	const play = deferred()
	const device = {} as SoundTouchDevice

	function wrapper({ children }: { children: React.ReactNode }) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>
	}

	const { result, unmount } = await renderHook(
		() => useSpeakerCommand(device, (_speaker, key: string) => (key === 'NEXT_TRACK' ? next.promise : play.promise)),
		{
			wrapper,
		}
	)

	await act(() => result.current.mutate('NEXT_TRACK'))
	await waitFor(() => expect(result.current.isPendingFor('NEXT_TRACK')).toBe(true))
	expect(result.current.isPendingFor('PLAY_PAUSE')).toBe(false)
	expect(result.current.isPendingFor('PREV_TRACK')).toBe(false)

	await act(() => result.current.mutate('PLAY_PAUSE'))
	await waitFor(() => expect(result.current.isPendingFor('PLAY_PAUSE')).toBe(true))
	expect(result.current.isPendingFor('NEXT_TRACK')).toBe(true)

	await act(() => play.resolve())
	await waitFor(() => expect(result.current.isPendingFor('PLAY_PAUSE')).toBe(false))
	expect(result.current.isPendingFor('NEXT_TRACK')).toBe(true)

	await act(() => next.reject(new Error('Speaker unavailable')))
	await waitFor(() => expect(result.current.isPendingFor('NEXT_TRACK')).toBe(false))

	await unmount()
	client.clear()
})
