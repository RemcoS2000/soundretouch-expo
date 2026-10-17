import type { NowPlaying, SoundTouchDevice } from '@soundretouch/api/device'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native'

import React from 'react'
import * as ReactNative from 'react-native'
import { Linking } from 'react-native'
import { type Mock, vi } from 'vitest'

import { AppBackground } from '../src/components/AppBackground'
import { MiniNowPlaying } from '../src/features/player/MiniNowPlaying'
import { Playback } from '../src/features/player/Playback'
import { PowerControl } from '../src/features/player/PowerControl'
import { PresetPanel } from '../src/features/player/PresetPanel'
import { SourcePanel } from '../src/features/player/SourcePanel'
import { VolumeControl } from '../src/features/player/VolumeControl'
import { useVolume } from '../src/hooks/useVolume'
import { AppSettingsProvider } from '../src/state/AppSettingsContext'

import { deferred } from './deferred'

const { mockData } = vi.hoisted(() => ({ mockData: {} as Record<string, unknown> }))
let { mockError } = vi.hoisted(() => ({ mockError: null as Error | null }))
let { mockLoading } = vi.hoisted(() => ({ mockLoading: false }))
const { mockRefetch } = vi.hoisted(() => ({ mockRefetch: vi.fn(async () => {}) }))

vi.mock('expo-router', () => ({ useIsFocused: () => true }))
vi.mock('../src/state/SoundTouchDevicesContext', () => ({ useSoundTouchDevices: () => ({ foreground: true }) }))
vi.mock('../src/features/speakers/session', () => ({ getSession: () => ({ command: (action: () => Promise<void>) => action() }) }))
vi.mock('../src/features/speakers/queries', () => ({
	useSpeakerResource: (_device: unknown, resource: string) => ({
		data: mockData[resource],
		dataUpdatedAt: Date.now(),
		isLoading: mockLoading,
		isError: !!mockError,
		error: mockError,
		refetch: mockRefetch,
	}),
}))
vi.mock('expo-image', () => ({
	Image: (props: object) => React.createElement(ReactNative.View, props),
}))
vi.mock('../src/design-system/Slider', () => ({
	__esModule: true,
	default: (props: object) => React.createElement(ReactNative.View, props),
}))
vi.mock('../src/design-system/VolumeSlider', () => ({
	__esModule: true,
	default: (props: object) => React.createElement(ReactNative.View, { ...props, testID: 'volume-input' }),
}))

/** Renders real player controls against a protocol double that cannot open network connections. */
async function setup(content: (device: SoundTouchDevice) => React.ReactNode) {
	const device = {
		keyPressAndRelease: vi.fn(async () => {}),
		setUserTrackControl: vi.fn(async () => {}),
		select: vi.fn(async () => {}),
		setVolume: vi.fn(async () => {}),
	} as unknown as SoundTouchDevice
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } })
	const screen = await render(
		<QueryClientProvider client={client}>
			<AppSettingsProvider>{content(device)}</AppSettingsProvider>
		</QueryClientProvider>
	)

	return { device, screen, client }
}

beforeEach(() => {
	Object.keys(mockData).forEach((key) => delete mockData[key])
	mockData.nowPlaying = {
		source: 'SPOTIFY',
		track: 'A long track title',
		artist: 'Artist',
		album: 'Album',
		playStatus: 'PLAY_STATE',
		time: { total: 180, elapsed: 30 },
		seekSupported: { value: true },
		shuffleSetting: 'SHUFFLE_OFF',
		repeatSetting: 'REPEAT_OFF',
		art: { url: 'artwork.jpg' },
	}
	mockError = null
	mockLoading = false
	vi.clearAllMocks()
})

afterEach(() => vi.restoreAllMocks())

test('transport controls send independent actions and preserve single-line metadata', async () => {
	const { screen, device } = await setup((speaker) => <Playback device={speaker} />)
	expect(screen.getByText('A long track title').props.numberOfLines).toBe(1)
	expect(screen.getByText('Artist · Album')).toBeTruthy()
	for (const [label, key] of [
		['Previous', 'PREV_TRACK'],
		['Pause', 'PLAY_PAUSE'],
		['Next', 'NEXT_TRACK'],
		['Shuffle off', 'SHUFFLE_ON'],
		['Repeat off', 'REPEAT_ALL'],
	] as const) {
		await fireEvent.press(screen.getByRole('button', { name: label }))
		await waitFor(() => expect(device.keyPressAndRelease).toHaveBeenCalledWith(key))
	}
	await fireEvent(screen.getByLabelText('Playback position'), 'valueChange', 60)
	expect(screen.getByLabelText('Playback position').props.value).toBe(60)
	await fireEvent(screen.getByLabelText('Playback position'), 'slidingComplete', 65)
	await waitFor(() => expect(device.setUserTrackControl).toHaveBeenCalledWith('SEEK_TO_TIME', 65))
})

test.each([
	['STANDBY', 'Ready when you are'],
	['AUX', 'Listening through AUX'],
	['INVALID_SOURCE', 'Choose something to play'],
])('renders %s without inappropriate playback controls', async (source, title) => {
	mockData.nowPlaying = { source }
	const { screen } = await setup((speaker) => <Playback device={speaker} />)
	expect(screen.getByText(title)).toBeTruthy()
	expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
})

test('retains last-known metadata, displays failures and lets the user retry', async () => {
	mockError = new Error('Speaker unavailable')
	mockLoading = true
	const { screen } = await setup((speaker) => <Playback device={speaker} />)
	expect(screen.getByText(/Showing last known playback/)).toBeTruthy()
	await fireEvent.press(screen.getByRole('button', { name: 'Retry' }))
	expect(mockRefetch).toHaveBeenCalled()
	expect(screen.getByLabelText('Loading speaker data')).toBeTruthy()
})

test('initial playback without a snapshot shows loading and never enables transport controls', async () => {
	mockData.nowPlaying = undefined
	mockLoading = true
	const { screen } = await setup((speaker) => <Playback device={speaker} />)
	expect(screen.getByText('Connecting')).toBeTruthy()
	expect(screen.getByText('Choose something to play')).toBeTruthy()
	expect(screen.getByLabelText('Loading speaker data')).toBeTruthy()
	expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
})

test('shows a busy play button while preserving other transport actions', async () => {
	const pending = deferred()
	const { screen, device } = await setup((speaker) => <Playback device={speaker} />)
	;(device.keyPressAndRelease as Mock).mockReturnValueOnce(pending.promise)
	await fireEvent.press(screen.getByRole('button', { name: 'Next' }))
	await waitFor(() => expect(screen.getByRole('button', { name: 'Pause' }).props.accessibilityState.busy).toBe(true))
	expect(screen.getByRole('button', { name: 'Previous' }).props.accessibilityState.disabled).toBe(false)
	await act(() => pending.resolve())
	await waitFor(() => expect(screen.getByRole('button', { name: 'Pause' }).props.accessibilityState.busy).toBe(false))
})

test.each([
	['SHUFFLE_ON', 'REPEAT_ALL', 'Shuffle on', 'Repeat all', 'SHUFFLE_OFF', 'REPEAT_ONE'],
	['SHUFFLE_OFF', 'REPEAT_ONE', 'Shuffle off', 'Repeat one', 'SHUFFLE_ON', 'REPEAT_OFF'],
])('cycles shuffle and repeat from %s and %s', async (shuffleSetting, repeatSetting, shuffleLabel, repeatLabel, shuffleKey, repeatKey) => {
	mockData.nowPlaying = { ...(mockData.nowPlaying as NowPlaying), shuffleSetting, repeatSetting, skipEnabled: false, skipPreviousEnabled: false }
	const { screen, device } = await setup((speaker) => <Playback device={speaker} />)
	await fireEvent.press(screen.getByRole('button', { name: shuffleLabel }))
	await fireEvent.press(screen.getByRole('button', { name: repeatLabel }))
	await waitFor(() => expect(device.keyPressAndRelease).toHaveBeenCalledWith(repeatKey))
	expect(device.keyPressAndRelease).toHaveBeenCalledWith(shuffleKey)
	expect(screen.getByRole('button', { name: 'Next' }).props.accessibilityState.disabled).toBe(true)
})

test('renders six presets, disables empty slots and selects a populated preset', async () => {
	mockData.presets = [{ id: 2, ContentItem: { itemName: 'News' } }]
	const { screen, device } = await setup((speaker) => <PresetPanel device={speaker} />)
	expect(screen.getAllByRole('button')).toHaveLength(6)
	await fireEvent.press(screen.getByRole('button', { name: '1. Empty preset' }))
	expect(device.keyPressAndRelease).not.toHaveBeenCalled()
	await fireEvent.press(screen.getByRole('button', { name: '2. News' }))
	await waitFor(() => expect(device.keyPressAndRelease).toHaveBeenCalledWith('PRESET_2'))
})

test('keeps accounts independent, omits absent accounts and reports Spotify launch failures', async () => {
	mockData.sources = {
		sourceItem: [
			{ source: 'SPOTIFY', sourceAccount: 'one', name: 'First account' },
			{ source: 'SPOTIFY', sourceAccount: 'two', name: 'Second account' },
			{ source: 'AUX', name: 'Cable' },
			{ source: 'ALEXA', name: 'Hidden' },
			{ source: 'BLUETOOTH', status: 'UNAVAILABLE', name: 'Unavailable' },
		],
	}
	mockData.nowPlaying = { source: 'SPOTIFY', ContentItem: { sourceAccount: 'one' } }
	vi.spyOn(Linking, 'openURL').mockRejectedValue(new Error('not installed'))
	const { screen, device } = await setup((speaker) => <SourcePanel device={speaker} />)
	expect(screen.getByRole('button', { name: 'First account · Current' }).props.accessibilityState.disabled).toBe(true)
	expect(screen.queryByText('Hidden')).toBeNull()
	await fireEvent.press(screen.getByRole('button', { name: 'Second account' }))
	await waitFor(() => expect(device.select).toHaveBeenCalledWith({ source: 'SPOTIFY', sourceAccount: 'two' }))
	await fireEvent.press(screen.getByRole('button', { name: 'Cable' }))
	await waitFor(() => expect(device.select).toHaveBeenCalledWith({ source: 'AUX' }))
	await fireEvent.press(screen.getByRole('button', { name: 'Open Spotify' }))
	await waitFor(() => expect(screen.getByText(/Spotify could not be opened/)).toBeTruthy())
})

test('empty sources and loading presets have clear non-interactive states', async () => {
	const { screen } = await setup((speaker) => (
		<>
			<SourcePanel device={speaker} />
			<PresetPanel device={speaker} />
		</>
	))
	expect(screen.getByText(/No available sources/)).toBeTruthy()
	await screen.unmount()
	mockLoading = true
	const loaded = await setup((speaker) => <PresetPanel device={speaker} />)
	expect(loaded.screen.getAllByRole('button', { name: /Loading preset/ })).toHaveLength(6)
})

test('volume previews stay local, cancel cleanly and commit only on release', async () => {
	mockData.volume = { actualvolume: 20, muteenabled: true }
	const { screen, device } = await setup((speaker) => <VolumeControl device={speaker} />)
	await fireEvent(screen.getByTestId('volume-input'), 'valueChange', 35)
	expect(screen.getByText('35%')).toBeTruthy()
	expect(device.setVolume).not.toHaveBeenCalled()
	await fireEvent(screen.getByTestId('volume-input'), 'cancel')
	expect(screen.getByText('20%')).toBeTruthy()
	await fireEvent(screen.getByTestId('volume-input'), 'slidingComplete', 30)
	await waitFor(() => expect(device.setVolume).toHaveBeenCalledWith(30, false))
	await waitFor(() => expect(screen.getByRole('button', { name: 'Volume +' }).props.accessibilityState.disabled).toBe(false))
	await fireEvent.press(screen.getByRole('button', { name: 'Volume +' }))
	await waitFor(() => expect(device.setVolume).toHaveBeenCalledWith(25, false))
	await waitFor(() => expect(screen.getByRole('button', { name: 'Volume −' }).props.accessibilityState.disabled).toBe(false))
	await fireEvent.press(screen.getByRole('button', { name: 'Volume −' }))
	await waitFor(() => expect(device.setVolume).toHaveBeenCalledWith(15, false))
})

test('volume cannot send a command after speaker selection has been cleared', async () => {
	const client = new QueryClient({ defaultOptions: { mutations: { gcTime: Infinity } } })
	/** Keeps the absent-speaker mutation within its normal cache boundary. */
	function wrapper({ children }: { children: React.ReactNode }) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>
	}
	const { result, unmount } = await renderHook(() => useVolume(null), { wrapper })
	expect(result.current.volume).toBe(0)
	await act(async () => {
		await expect(result.current.setVolume(50)).rejects.toThrow('No speaker selected')
	})
	await waitFor(() => expect(result.current.error).toBeInstanceOf(Error))
	await unmount()
	client.clear()
})

test.each([
	['STANDBY', 'Turn speaker on', 'Standby'],
	['AUX', 'Put speaker in standby', 'AUX audio'],
	['SPOTIFY', 'Put speaker in standby', 'No audio playing'],
])('compact playback and power describe %s accurately', async (source, powerLabel, compactLabel) => {
	mockData.nowPlaying = { source }
	const { screen, device } = await setup((speaker) => (
		<>
			<MiniNowPlaying device={speaker} active />
			<PowerControl device={speaker} />
		</>
	))
	expect(screen.getByText(compactLabel)).toBeTruthy()
	await fireEvent.press(screen.getByRole('button', { name: powerLabel }))
	await waitFor(() => expect(device.keyPressAndRelease).toHaveBeenCalledWith('POWER'))
	if (source === 'SPOTIFY') {
		await fireEvent.press(screen.getByRole('button', { name: 'Play' }))
		await waitFor(() => expect(device.keyPressAndRelease).toHaveBeenCalledWith('PLAY_PAUSE'))
	}
})

test('broken artwork falls back and a new artwork URL is tried again', async () => {
	const { screen, device, client } = await setup((speaker) => (
		<>
			<Playback device={speaker} />
			<AppBackground device={speaker} />
		</>
	))
	const artwork = screen.getByLabelText('Current album artwork')
	expect(artwork.props.source).toEqual({ uri: 'artwork.jpg' })
	await fireEvent(artwork, 'error')
	expect(screen.getByLabelText('Current album artwork').props.source).not.toEqual({ uri: 'artwork.jpg' })
	mockData.nowPlaying = { source: 'SPOTIFY', art: { url: 'new-artwork.jpg' }, ContentItem: { itemName: 'Station' } }
	await screen.rerender(
		<QueryClientProvider client={client}>
			<AppSettingsProvider>
				<Playback device={device} />
				<AppBackground device={device} />
			</AppSettingsProvider>
		</QueryClientProvider>
	)
	expect(screen.getByLabelText('Current album artwork').props.source).toEqual({ uri: 'new-artwork.jpg' })
	expect(screen.getByText('Station')).toBeTruthy()
})

test.each(['sources', 'presets'])('%s failures expose a working retry instead of discarding the panel', async (panel) => {
	mockError = new Error('Speaker unavailable')
	const { screen } = await setup((speaker) => (panel === 'sources' ? <SourcePanel device={speaker} /> : <PresetPanel device={speaker} />))
	await fireEvent.press(screen.getByRole('button', { name: 'Retry' }))
	expect(mockRefetch).toHaveBeenCalled()
})
