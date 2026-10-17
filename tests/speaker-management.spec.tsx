import type { SoundTouchDevice } from '@soundretouch/api/device'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'

import React from 'react'
import * as ReactNative from 'react-native'
import { Alert, Animated } from 'react-native'
import { vi } from 'vitest'

import { SpeakerDropdown } from '../src/features/player/SpeakerDropdown'
import { probeSpeaker } from '../src/features/speakers/client'
import { AddDeviceManualModal } from '../src/modals/AddDeviceManualModal'
import DeviceManagerScreen from '../src/screens/device-manager/DeviceManagerScreen'
import AppSettingsScreen from '../src/screens/settings/AppSettingsScreen'
import { AppSettingsProvider } from '../src/state/AppSettingsContext'
import type { SoundTouchDeviceEntry } from '../src/state/SoundTouchDevicesContext'

import { deferred } from './deferred'

const { mockRouter } = vi.hoisted(() => ({ mockRouter: { push: vi.fn(), back: vi.fn(), replace: vi.fn(), canGoBack: vi.fn(() => true) } }))
const { mockRegistry } = vi.hoisted(() => ({
	mockRegistry: {
		devices: [] as SoundTouchDeviceEntry[],
		hydrated: true,
		error: null as string | null,
		retryStorage: vi.fn(),
		addDevice: vi.fn(),
		removeDevice: vi.fn(),
	},
}))
const { mockDiscovery } = vi.hoisted(() => ({
	mockDiscovery: { status: 'idle', results: [] as SoundTouchDeviceEntry[], supported: true, start: vi.fn(), stop: vi.fn() },
}))
const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }))

vi.mock('expo-router', () => ({ useRouter: () => mockRouter }))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }) }))
vi.mock('../src/state/SoundTouchDevicesContext', () => ({ useSoundTouchDevices: () => mockRegistry }))
vi.mock('../src/state/ActiveSpeakerContext', () => ({ useActiveSpeaker: () => ({ activeId: 'AABB', selectSpeaker: mockSelect }) }))
vi.mock('../src/hooks/useDeviceDiscovery', () => ({ useDeviceDiscovery: () => mockDiscovery }))
vi.mock('../src/features/speakers/client', () => ({ probeSpeaker: vi.fn() }))
vi.mock('../src/features/speakers/queries', () => ({ useSpeakerResource: () => ({ data: { track: 'Current track', source: 'SPOTIFY' } }) }))
vi.mock('expo-image', () => ({
	Image: (props: object) => React.createElement(ReactNative.View, props),
}))

/** Returns a saved speaker whose only lifecycle operation is a disposal spy. */
function speaker(host = '192.168.1.2', id = 'AABB') {
	return { device: { host, dispose: vi.fn() } as unknown as SoundTouchDevice, info: { name: 'Office', type: 'SoundTouch 10', deviceID: id } }
}

beforeEach(() => {
	vi.clearAllMocks()
	mockRegistry.devices = []
	mockRegistry.hydrated = true
	mockRegistry.error = null
	mockDiscovery.status = 'idle'
	mockDiscovery.results = []
	mockDiscovery.supported = true
	vi.mocked(probeSpeaker).mockReset()
})

afterEach(() => vi.restoreAllMocks())

test('manual verification adds only the confirmed candidate and transfers client ownership', async () => {
	const candidate = speaker()
	vi.mocked(probeSpeaker).mockResolvedValue(candidate)
	const close = vi.fn()
	const screen = await render(
		<AppSettingsProvider>
			<AddDeviceManualModal visible onClose={close} />
		</AppSettingsProvider>
	)
	await fireEvent.changeText(screen.getByLabelText('Speaker IP address or hostname'), 'speaker.local')
	await fireEvent.press(screen.getByRole('button', { name: 'Look for speaker' }))
	await waitFor(() => expect(screen.getByText('Office')).toBeTruthy())
	expect(probeSpeaker).toHaveBeenCalledWith('speaker.local', expect.any(AbortSignal))
	await fireEvent.press(screen.getByRole('button', { name: 'Add speaker' }))
	expect(mockRegistry.addDevice).toHaveBeenCalledWith(candidate)
	expect(close).toHaveBeenCalled()
	await screen.unmount()
	expect(candidate.device.dispose).not.toHaveBeenCalled()
})

test('manual lookup failures remain retryable and close releases unadopted candidates', async () => {
	vi.mocked(probeSpeaker).mockRejectedValueOnce(new Error('Address unreachable')).mockResolvedValueOnce(speaker())
	const screen = await render(
		<AppSettingsProvider>
			<AddDeviceManualModal visible onClose={vi.fn()} />
		</AppSettingsProvider>
	)
	await fireEvent.changeText(screen.getByLabelText('Speaker IP address or hostname'), 'speaker.local')
	await fireEvent(screen.getByLabelText('Speaker IP address or hostname'), 'submitEditing')
	await waitFor(() => expect(screen.getByText('Address unreachable')).toBeTruthy())
	await fireEvent.press(screen.getByRole('button', { name: 'Try again' }))
	await waitFor(() => expect(screen.getByText('Office')).toBeTruthy())
	const candidate = await vi.mocked(probeSpeaker).mock.results[1]?.value
	await fireEvent.press(screen.getByRole('button', { name: 'Close' }))
	expect(candidate?.device.dispose).toHaveBeenCalled()
})

test('cancelled manual lookups ignore late results and release their clients', async () => {
	const pending = deferred<ReturnType<typeof speaker>>()
	vi.mocked(probeSpeaker).mockReturnValue(pending.promise)
	const close = vi.fn()
	const screen = await render(
		<AppSettingsProvider>
			<AddDeviceManualModal visible onClose={close} />
		</AppSettingsProvider>
	)
	await fireEvent.changeText(screen.getByLabelText('Speaker IP address or hostname'), 'speaker.local')
	await fireEvent.press(screen.getByRole('button', { name: 'Look for speaker' }))
	await fireEvent.press(screen.getByRole('button', { name: 'Cancel lookup' }))
	const signal = vi.mocked(probeSpeaker).mock.calls[0]?.[1]
	expect(signal?.aborted).toBe(true)
	const candidate = speaker()
	await act(() => pending.resolve(candidate))
	expect(candidate.device.dispose).toHaveBeenCalled()
	expect(mockRegistry.addDevice).not.toHaveBeenCalled()
	expect(close).toHaveBeenCalled()
})

test('speaker removal requires confirmation and discovery results reconcile changed addresses', async () => {
	mockRegistry.devices = [speaker()]
	mockDiscovery.results = [speaker('192.168.1.3'), speaker('192.168.1.4', 'CCDD')]
	const alert = vi.spyOn(Alert, 'alert')
	const screen = await render(
		<AppSettingsProvider>
			<DeviceManagerScreen />
		</AppSettingsProvider>
	)
	await fireEvent.press(screen.getByRole('button', { name: 'Remove Office' }))
	expect(mockRegistry.removeDevice).not.toHaveBeenCalled()
	await act(() => alert.mock.calls[0]?.[2]?.find((button) => button.text === 'Remove')?.onPress?.())
	expect(mockRegistry.removeDevice).toHaveBeenCalledWith('192.168.1.2')
	await fireEvent.press(screen.getByRole('button', { name: 'Update speaker address' }))
	expect(mockRegistry.addDevice).toHaveBeenCalledWith(mockDiscovery.results[0])
	await fireEvent.press(screen.getByRole('button', { name: 'Add speaker' }))
	expect(mockRegistry.addDevice).toHaveBeenCalledWith(mockDiscovery.results[1])
	await fireEvent.press(screen.getByRole('button', { name: 'Scan local network' }))
	expect(mockDiscovery.start).toHaveBeenCalled()
	await fireEvent.press(screen.getByRole('button', { name: 'Add by IP or hostname' }))
	expect(screen.getByLabelText('Speaker IP address or hostname')).toBeTruthy()
	await fireEvent.press(screen.getByRole('button', { name: 'Close' }))
})

test.each([
	['complete', 'No speakers found'],
	['error', 'Could not scan'],
	['scanning', null],
])('discovery feedback handles %s', async (status, message) => {
	mockDiscovery.status = status
	const screen = await render(
		<AppSettingsProvider>
			<DeviceManagerScreen />
		</AppSettingsProvider>
	)
	if (message) {
		expect(screen.getByText(new RegExp(message))).toBeTruthy()
	} else {
		await fireEvent.press(screen.getByRole('button', { name: 'Stop scanning' }))
		expect(mockDiscovery.stop).toHaveBeenCalled()
	}
})

test('appearance controls persist choices and back navigation falls back for direct links', async () => {
	const screen = await render(
		<AppSettingsProvider>
			<AppSettingsScreen />
		</AppSettingsProvider>
	)
	for (const label of ['Dark mode', 'Light mode', 'Follow device appearance']) {
		await fireEvent.press(screen.getByRole('button', { name: label }))
		expect(screen.getByRole('button', { name: label }).props.accessibilityState.selected).toBe(true)
	}
	await fireEvent.press(screen.getByRole('button', { name: 'Back' }))
	expect(mockRouter.back).toHaveBeenCalled()
	mockRouter.canGoBack.mockReturnValue(false)
	await fireEvent.press(screen.getByRole('button', { name: 'Back' }))
	expect(mockRouter.replace).toHaveBeenCalledWith('/')
})

test('dropdown selects speakers, exposes add and closes via the backdrop', async () => {
	mockRegistry.devices = [speaker(), { ...speaker('192.168.1.3', 'CCDD'), info: { name: 'Kitchen' } }]
	const close = vi.fn()
	const add = vi.fn()
	const screen = await render(
		<AppSettingsProvider>
			<SpeakerDropdown open progress={new Animated.Value(1)} top={80} onClose={close} onAdd={add} />
		</AppSettingsProvider>
	)
	await fireEvent.press(screen.getByRole('button', { name: 'Select Kitchen' }))
	expect(mockSelect).toHaveBeenCalledWith('host:192.168.1.3')
	expect(close).toHaveBeenCalled()
	await fireEvent.press(screen.getByRole('button', { name: 'Add speaker' }))
	expect(add).toHaveBeenCalled()
	await fireEvent.press(screen.getByRole('button', { name: 'Close speaker selection' }))
	expect(close).toHaveBeenCalledTimes(2)
})
