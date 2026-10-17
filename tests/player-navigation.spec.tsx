import type { SoundTouchDevice } from '@soundretouch/api/device'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react-native'

import React from 'react'
import * as ReactNative from 'react-native'
import { AccessibilityInfo } from 'react-native'
import { vi } from 'vitest'

import type { GroupSnapshot } from '../src/features/groups/groups'
import GroupsScreen, { GroupControls } from '../src/features/groups/GroupsScreen'
import NowPlayingScreen from '../src/features/player/NowPlayingScreen'
import { AppSettingsProvider } from '../src/state/AppSettingsContext'
import type { SoundTouchDeviceEntry } from '../src/state/SoundTouchDevicesContext'

const { mockRouter } = vi.hoisted(() => ({ mockRouter: { push: vi.fn(), setParams: vi.fn() } }))
const { mockNavigation } = vi.hoisted(() => ({ mockNavigation: { addListener: vi.fn(() => vi.fn()) } }))
const { mockRegistry } = vi.hoisted(() => ({
	mockRegistry: { devices: [] as SoundTouchDeviceEntry[], hydrated: true, error: null as string | null, retryStorage: vi.fn(), foreground: true },
}))
const { mockGroup } = vi.hoisted(() => ({
	mockGroup: {
		inspection: { isLoading: false, error: null, data: { excluded: [] as string[] }, refetch: vi.fn(async () => {}) },
		mutation: { mutate: vi.fn(), isPending: false, error: null, data: undefined },
		masterError: null as string | null,
		master: undefined as GroupSnapshot | undefined,
		selected: undefined as GroupSnapshot | undefined,
		snapshots: [] as GroupSnapshot[],
	},
}))
let { mockZone } = vi.hoisted(() => ({ mockZone: {} as { master?: string } }))
let { mockActiveId } = vi.hoisted(() => ({ mockActiveId: 'AABB' as string | null }))
let { mockParams } = vi.hoisted(() => ({ mockParams: {} as { id?: string; speakers?: string } }))
const { mockRefetch } = vi.hoisted(() => ({ mockRefetch: vi.fn(async () => {}) }))
const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }))

vi.mock('expo-router', () => ({
	useRouter: () => mockRouter,
	useNavigation: () => mockNavigation,
	useIsFocused: () => true,
	useLocalSearchParams: () => mockParams,
	useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
}))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }))
vi.mock('../src/state/SoundTouchDevicesContext', () => ({ useSoundTouchDevices: () => mockRegistry }))
vi.mock('../src/state/ActiveSpeakerContext', () => ({ useActiveSpeaker: () => ({ activeId: mockActiveId, selectSpeaker: mockSelect }) }))
vi.mock('../src/features/groups/useGroupModel', () => ({ useGroupModel: () => mockGroup }))
vi.mock('../src/features/speakers/session', () => ({ getSession: () => ({ command: (action: () => Promise<void>) => action() }) }))
vi.mock('../src/features/speakers/queries', () => ({
	useSpeakerConnection: () => ({ data: 'open' }),
	useSpeakerResource: (_device: unknown, resource: string) => ({
		data:
			resource === 'zone'
				? mockZone
				: resource === 'nowPlaying'
					? { source: 'SPOTIFY', track: 'Playing track' }
					: resource === 'volume'
						? { actualvolume: 20 }
						: undefined,
		dataUpdatedAt: Date.now(),
		error: null,
		refetch: mockRefetch,
	}),
}))
vi.mock('expo-image', () => ({
	Image: (props: object) => React.createElement(ReactNative.View, props),
}))

/** Creates isolated speakers for navigation and group eligibility scenarios. */
function speaker(id: string, name: string): SoundTouchDeviceEntry {
	return {
		device: {
			host: `${name}.local`,
			keyPressAndRelease: vi.fn(async () => {}),
			select: vi.fn(async () => {}),
			setVolume: vi.fn(async () => {}),
		} as unknown as SoundTouchDevice,
		info: { deviceID: id, name },
	}
}

/** Supplies theme and command caches while keeping all protocol operations mocked. */
async function renderScreen(content: React.ReactNode) {
	const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } } })

	return render(
		<QueryClientProvider client={client}>
			<AppSettingsProvider>{content}</AppSettingsProvider>
		</QueryClientProvider>
	)
}

beforeEach(() => {
	vi.clearAllMocks()
	mockRegistry.devices = [speaker('AABB', 'Office'), speaker('CCDD', 'Kitchen')]
	mockRegistry.hydrated = true
	mockRegistry.error = null
	mockActiveId = 'AABB'
	mockZone = {}
	mockParams = {}
	mockGroup.master = undefined
	mockGroup.masterError = null
	mockGroup.selected = undefined
	mockGroup.snapshots = []
	vi.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
})

afterEach(() => vi.restoreAllMocks())

test('now playing opens speaker selection and keeps configuration panels in the sheet', async () => {
	const screen = await renderScreen(<NowPlayingScreen />)
	await fireEvent.press(screen.getByRole('button', { name: 'Choose speaker' }))
	await waitFor(() => expect(screen.getByRole('button', { name: 'Select Kitchen' })).toBeTruthy())
	await fireEvent.press(screen.getByRole('button', { name: 'Select Kitchen' }))
	expect(mockSelect).toHaveBeenCalledWith('CCDD')
	await fireEvent.press(screen.getByRole('button', { name: 'Open settings' }))
	expect(mockRouter.push).toHaveBeenCalledWith('/settings')
	await fireEvent.press(screen.getByRole('button', { name: 'Expand speaker controls' }))
	expect(screen.getByRole('tab', { name: 'Sources' }).props.accessibilityState.selected).toBe(true)
	await fireEvent.press(screen.getByRole('tab', { name: 'Presets' }))
	expect(screen.getAllByRole('button', { name: /Empty preset/ })).toHaveLength(6)
	await fireEvent.press(screen.getByRole('tab', { name: 'Group' }))
	await fireEvent.press(screen.getByRole('tab', { name: 'Speaker' }))
	await fireEvent.press(screen.getByRole('button', { name: 'Manage speakers' }))
	expect(mockRouter.push).toHaveBeenCalledWith('/device-manager')
	await fireEvent.press(screen.getByRole('button', { name: 'Collapse speaker controls' }))
	expect(screen.queryByRole('tab', { name: 'Sources' })).toBeNull()
})

test('wide player retains speaker selection and opens add-speaker from the dropdown', async () => {
	vi.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
		width: 1200,
		height: 900,
		scale: 1,
		fontScale: 1,
	})
	const screen = await renderScreen(<NowPlayingScreen />)
	await fireEvent.press(screen.getByRole('button', { name: 'Choose speaker' }))
	await fireEvent.press(screen.getByRole('button', { name: 'Add speaker' }))
	expect(mockRouter.push).toHaveBeenCalledWith('/device-manager')
})

test('an unavailable group master blocks playback while preserving local controls', async () => {
	mockZone = { master: 'UNKNOWN' }
	const screen = await renderScreen(<NowPlayingScreen />)
	expect(screen.getByText(/Add the group master to control playback/)).toBeTruthy()
	expect(screen.queryByText('Playing track')).toBeNull()
})

test('group members route playback through their saved master', async () => {
	mockActiveId = 'CCDD'
	mockZone = { master: 'AABB' }
	const screen = await renderScreen(<NowPlayingScreen />)
	expect(screen.getByText(/Grouped with Office/)).toBeTruthy()
	expect(screen.getByText('Playing track')).toBeTruthy()
})

test('empty and hydrating states offer settings, recovery and add-speaker navigation', async () => {
	mockRegistry.devices = []
	mockRegistry.error = 'Storage unavailable'
	const screen = await renderScreen(<NowPlayingScreen />)
	await fireEvent.press(screen.getByRole('button', { name: 'Add a speaker' }))
	expect(mockRouter.push).toHaveBeenCalledWith('/device-manager')
	await fireEvent.press(screen.getByRole('button', { name: 'Retry' }))
	expect(mockRegistry.retryStorage).toHaveBeenCalled()
	await fireEvent.press(screen.getByRole('button', { name: 'Open settings' }))
	expect(mockRouter.push).toHaveBeenCalledWith('/settings')
})

test('group actions reflect eligibility, inaccessible members and the explicit volume target', async () => {
	const masterEntry = mockRegistry.devices[0]!
	const otherEntry = mockRegistry.devices[1]!
	const master: GroupSnapshot = {
		entry: masterEntry,
		info: masterEntry.info!,
		member: { macAddress: 'AABB', ipaddress: '192.168.1.2' },
		zone: {
			master: 'AABB',
			member: [
				{ macAddress: 'AABB', ipaddress: '192.168.1.2' },
				{ macAddress: 'CCDD', ipaddress: '192.168.1.3' },
				{ macAddress: 'EEFF', ipaddress: '192.168.1.4' },
			],
		},
	}
	const other: GroupSnapshot = {
		entry: otherEntry,
		info: otherEntry.info!,
		member: { macAddress: 'CCDD', ipaddress: '192.168.1.3' },
		zone: { master: 'AABB' },
	}
	mockGroup.master = master
	mockGroup.selected = master
	mockGroup.snapshots = [master, other]
	const screen = await renderScreen(<GroupControls entry={masterEntry} showSelectedVolume={false} />)
	for (const [label, action] of [
		['Play everywhere', 'everywhere'],
		['Ungroup all speakers', 'ungroup'],
		['Remove from group', 'remove'],
		['Remove unavailable member', 'remove'],
	] as const) {
		await fireEvent.press(screen.getByRole('button', { name: label }))
		expect(mockGroup.mutation.mutate).toHaveBeenLastCalledWith(expect.objectContaining({ action }))
	}
	expect(screen.getAllByText('Volume')).toHaveLength(1)
})

test('direct group links report removed speakers without performing mutations', async () => {
	mockParams = { id: 'missing' }
	const screen = await renderScreen(<GroupsScreen />)
	expect(screen.getByText('This speaker is no longer saved.')).toBeTruthy()
	expect(mockGroup.mutation.mutate).not.toHaveBeenCalled()
})

test.each(['standalone', 'joined', 'foreign'] as const)('group controls handle a %s speaker without moving it from another group', async (state) => {
	const masterEntry = mockRegistry.devices[0]!
	const memberEntry = mockRegistry.devices[1]!
	const master: GroupSnapshot = {
		entry: masterEntry,
		info: masterEntry.info!,
		member: { macAddress: 'AABB', ipaddress: '192.168.1.2' },
		zone: { master: 'AABB', member: state === 'joined' ? [{ macAddress: 'AABB' }, { macAddress: 'CCDD' }] : [{ macAddress: 'AABB' }] },
	}
	const member: GroupSnapshot = {
		entry: memberEntry,
		info: memberEntry.info!,
		member: { macAddress: 'CCDD', ipaddress: '192.168.1.3' },
		zone: { master: state === 'foreign' ? 'EEFF' : state === 'joined' ? 'AABB' : '' },
	}
	mockGroup.master = master
	mockGroup.selected = member
	mockGroup.snapshots = [master, member]
	const screen = await renderScreen(<GroupControls entry={memberEntry} showSelectedVolume={false} />)
	const label = state === 'joined' ? 'Remove from group' : 'Add to group'
	await fireEvent.press(screen.getByRole('button', { name: label }))
	if (state === 'foreign') {
		expect(mockGroup.mutation.mutate).not.toHaveBeenCalled()
		expect(screen.getByText(/Belongs to another group/)).toBeTruthy()
	} else {
		expect(mockGroup.mutation.mutate).toHaveBeenCalledWith({ action: state === 'joined' ? 'remove' : 'add', target: 'CCDD' })
	}
	await fireEvent.press(screen.getByRole('button', { name: 'Leave this group' }))
	expect(mockGroup.mutation.mutate).toHaveBeenLastCalledWith({ action: 'leave' })
	expect(screen.getAllByText('Volume')).toHaveLength(1)
})

test('group master resolution errors offer refresh instead of unsafe membership actions', async () => {
	mockGroup.masterError = 'Group master is unavailable'
	const screen = await renderScreen(<GroupControls entry={mockRegistry.devices[0]!} />)
	expect(screen.getByText('Group master is unavailable')).toBeTruthy()
	expect(screen.queryByRole('button', { name: 'Play everywhere' })).toBeNull()
	await fireEvent.press(screen.getByRole('button', { name: 'Retry' }))
	expect(mockGroup.inspection.refetch).toHaveBeenCalled()
})
