import type { SoundTouchDevice } from '@soundretouch/api/device'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react-native'

import React from 'react'
import { Text } from 'react-native'
import { vi } from 'vitest'

import { AppSettingsProvider, useAppSettings } from '../src/state/AppSettingsContext'
import { ArtworkThemeProvider } from '../src/state/ArtworkThemeProvider'
import { artworkPixels } from '../src/theme/artworkPixels'

let { mockSource } = vi.hoisted(() => ({ mockSource: 'SPOTIFY' }))
let { mockForeground } = vi.hoisted(() => ({ mockForeground: true }))
let { mockMaster } = vi.hoisted(() => ({ mockMaster: '' }))
const { mockSpeaker } = vi.hoisted(() => ({ mockSpeaker: { host: 'fixture.invalid' } as SoundTouchDevice }))
const { mockGroupMaster } = vi.hoisted(() => ({ mockGroupMaster: { host: 'master.invalid' } as SoundTouchDevice }))
const { mockResource } = vi.hoisted(() => ({
	mockResource: vi.fn((_device: SoundTouchDevice, resource: string) => ({
		data: resource === 'zone' ? { master: mockMaster } : { source: mockSource, art: { url: 'art.jpg' } },
	})),
}))

vi.mock('../src/state/ActiveSpeakerContext', () => ({ useActiveSpeaker: () => ({ activeId: 'AABB' }) }))
vi.mock('../src/state/SoundTouchDevicesContext', () => ({
	useSoundTouchDevices: () => ({
		foreground: mockForeground,
		devices: [
			{ device: mockSpeaker, info: { deviceID: 'AABB' } },
			{ device: mockGroupMaster, info: { deviceID: 'CCDD' } },
		],
	}),
}))
vi.mock('../src/features/speakers/queries', () => ({ useSpeakerResource: (device: SoundTouchDevice, resource: string) => mockResource(device, resource) }))
vi.mock('../src/theme/artworkPixels', () => ({ artworkPixels: vi.fn() }))

/** Exposes the effective shared accent as visible output for provider-level assertions. */
function ThemeProbe() {
	const { colors } = useAppSettings()

	return <Text>{colors.accent}</Text>
}

beforeEach(() => {
	mockSource = 'SPOTIFY'
	mockForeground = true
	mockMaster = ''
	vi.clearAllMocks()
})

test('samples group-master artwork once and reuses its cached accent', async () => {
	mockMaster = 'CCDD'
	vi.mocked(artworkPixels).mockResolvedValue(new Uint8ClampedArray([255, 0, 0, 255, 240, 0, 0, 255]))
	const client = new QueryClient()
	const screen = await render(
		<QueryClientProvider client={client}>
			<AppSettingsProvider>
				<ArtworkThemeProvider>
					<ThemeProbe />
				</ArtworkThemeProvider>
			</AppSettingsProvider>
		</QueryClientProvider>
	)
	await waitFor(() => expect(client.getQueryData(['artwork-accent', 'art.jpg'])).not.toBeUndefined())
	expect(mockResource).toHaveBeenCalledWith(mockGroupMaster, 'nowPlaying')
	expect(artworkPixels).toHaveBeenCalledTimes(1)
	expect(screen.getByText(/^#/)).toBeTruthy()
	await screen.unmount()
	client.clear()
})

test.each(['STANDBY', 'INVALID_SOURCE', 'background'])('does not sample unavailable artwork for %s', async (state) => {
	mockSource = state === 'background' ? 'SPOTIFY' : state
	mockForeground = state !== 'background'
	const client = new QueryClient()
	const screen = await render(
		<QueryClientProvider client={client}>
			<AppSettingsProvider>
				<ArtworkThemeProvider>
					<ThemeProbe />
				</ArtworkThemeProvider>
			</AppSettingsProvider>
		</QueryClientProvider>
	)
	expect(artworkPixels).not.toHaveBeenCalled()
	await screen.unmount()
	client.clear()
})

test('a failed artwork sample keeps the normal theme and does not retry', async () => {
	vi.mocked(artworkPixels).mockRejectedValue(new Error('Artwork unavailable'))
	const client = new QueryClient()
	const screen = await render(
		<QueryClientProvider client={client}>
			<AppSettingsProvider>
				<ArtworkThemeProvider>
					<ThemeProbe />
				</ArtworkThemeProvider>
			</AppSettingsProvider>
		</QueryClientProvider>
	)
	await waitFor(() => expect(client.getQueryState(['artwork-accent', 'art.jpg'])?.status).toBe('error'))
	expect(artworkPixels).toHaveBeenCalledTimes(1)
	expect(screen.getByText(/^#/)).toBeTruthy()
	await screen.unmount()
	client.clear()
})
