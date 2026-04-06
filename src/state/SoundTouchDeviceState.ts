import type { DeviceInfo, NowPlaying, Presets, SoundTouchDevice, Sources, Volume, Zone } from '@soundretouch/api/device'

import { AppState } from 'react-native'

export type SoundTouchDeviceStateValue = {
	nowPlaying: NowPlaying | null
	info: DeviceInfo | null
	sources: Sources | null
	presets: Presets
	volume: Volume | null
	zone: Zone
	isSourcesLoading: boolean
	isPresetsLoading: boolean
	isVolumeLoading: boolean
	isZoneLoading: boolean
}

const EMPTY_SNAPSHOT: SoundTouchDeviceStateValue = {
	nowPlaying: null,
	info: null,
	sources: null,
	presets: [],
	volume: null,
	zone: {},
	isSourcesLoading: false,
	isPresetsLoading: false,
	isVolumeLoading: false,
	isZoneLoading: false,
}

const states = new Map<string, SoundTouchDeviceState>()

export class SoundTouchDeviceState {
	device: SoundTouchDevice

	private listeners = new Set<() => void>()
	private retainCount = 0
	private started = false
	private unsubscribeNowPlaying = () => {}
	private unsubscribeSources = () => {}
	private unsubscribePresets = () => {}
	private unsubscribeVolume = () => {}
	private unsubscribeZone = () => {}
	private appStateSubscription: { remove: () => void } | null = null
	private snapshot: SoundTouchDeviceStateValue = EMPTY_SNAPSHOT

	constructor(device: SoundTouchDevice) {
		this.device = device
	}

	/**
	 * Returns the current shared snapshot for this device.
	 */
	getSnapshot = () => this.snapshot

	/**
	 * Registers a listener that is notified whenever the shared snapshot changes.
	 */
	subscribe = (listener: () => void) => {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}

	/**
	 * Starts the device state when the first consumer appears.
	 */
	retain = () => {
		this.retainCount += 1
		if (this.retainCount === 1) {
			this.start()
		}
	}

	/**
	 * Stops the device state when the last consumer disappears.
	 */
	release = () => {
		this.retainCount = Math.max(0, this.retainCount - 1)
		if (this.retainCount === 0) {
			this.stop()
			states.delete(this.device.host)
		}
	}

	/**
	 * Refreshes every tracked device resource in parallel.
	 */
	refresh = async () => {
		await Promise.all([
			this.refreshNowPlaying(),
			this.refreshInfo(),
			this.refreshSources(),
			this.refreshPresets(),
			this.refreshVolume(),
			this.refreshZone(),
		])
	}

	/**
	 * Starts subscriptions, performs an initial refresh, and refreshes on app resume.
	 */
	private start = () => {
		if (this.started) return
		this.started = true
		this.subscribeToDevice()
		void this.refresh()
		this.appStateSubscription = AppState.addEventListener('change', (state) => {
			if (state !== 'active') return
			this.subscribeToDevice()
			void this.refresh()
		})
	}

	/**
	 * Tears down all device subscriptions and app lifecycle listeners.
	 */
	private stop = () => {
		if (!this.started) return
		this.started = false
		this.unsubscribeNowPlaying()
		this.unsubscribeSources()
		this.unsubscribePresets()
		this.unsubscribeVolume()
		this.unsubscribeZone()
		this.unsubscribeNowPlaying = () => {}
		this.unsubscribeSources = () => {}
		this.unsubscribePresets = () => {}
		this.unsubscribeVolume = () => {}
		this.unsubscribeZone = () => {}
		this.appStateSubscription?.remove()
		this.appStateSubscription = null
	}

	/**
	 * Subscribes to the device event streams that drive the shared snapshot.
	 */
	private subscribeToDevice = () => {
		this.unsubscribeNowPlaying()
		this.unsubscribeSources()
		this.unsubscribePresets()
		this.unsubscribeVolume()
		this.unsubscribeZone()

		this.unsubscribeNowPlaying = this.device.onNowPlayingUpdated((nowPlaying) => {
			this.setSnapshot((current) => ({
				...current,
				nowPlaying,
			}))
		})

		this.unsubscribeSources = this.device.onSourcesUpdated(() => {
			void this.refreshSources()
		})

		this.unsubscribePresets = this.device.onPresetsUpdated((presets) => {
			this.setSnapshot((current) => ({
				...current,
				presets,
				isPresetsLoading: false,
			}))
		})

		this.unsubscribeVolume = this.device.onVolumeUpdated((payload) => {
			this.setSnapshot((current) => ({
				...current,
				volume: payload,
				isVolumeLoading: false,
			}))
		})

		this.unsubscribeZone = this.device.onZoneUpdated(() => {
			void this.refreshZone()
		})
	}

	/**
	 * Refreshes the current now-playing payload.
	 */
	private refreshNowPlaying = async () => {
		try {
			const nowPlaying = await this.device.nowPlaying()
			this.setSnapshot((current) => ({
				...current,
				nowPlaying,
			}))
		} catch {
			// Keep current now playing snapshot on transient failures.
		}
	}

	/**
	 * Refreshes the current device info payload.
	 */
	private refreshInfo = async () => {
		try {
			const info = await this.device.info()
			this.setSnapshot((current) => ({
				...current,
				info,
			}))
		} catch {
			// Keep current info snapshot on transient failures.
		}
	}

	/**
	 * Refreshes the filtered source list.
	 */
	private refreshSources = async () => {
		this.setSnapshot((current) => ({
			...current,
			isSourcesLoading: true,
		}))

		try {
			const sources = await this.device.sources()
			this.setSnapshot((current) => ({
				...current,
				sources,
				isSourcesLoading: false,
			}))
		} catch {
			this.setSnapshot((current) => ({
				...current,
				isSourcesLoading: false,
			}))
		}
	}

	/**
	 * Refreshes the device preset list.
	 */
	private refreshPresets = async () => {
		this.setSnapshot((current) => ({
			...current,
			isPresetsLoading: true,
		}))

		try {
			const presets = await this.device.presets()
			this.setSnapshot((current) => ({
				...current,
				presets,
				isPresetsLoading: false,
			}))
		} catch {
			this.setSnapshot((current) => ({
				...current,
				isPresetsLoading: false,
			}))
		}
	}

	/**
	 * Refreshes the current volume and mute state.
	 */
	private refreshVolume = async () => {
		this.setSnapshot((current) => ({
			...current,
			isVolumeLoading: true,
		}))

		try {
			const volume = await this.device.volume()
			this.setSnapshot((current) => ({
				...current,
				volume,
				isVolumeLoading: false,
			}))
		} catch {
			this.setSnapshot((current) => ({
				...current,
				isVolumeLoading: false,
			}))
		}
	}

	/**
	 * Refreshes the active zone payload and derived zone membership flags.
	 */
	private refreshZone = async () => {
		this.setSnapshot((current) => ({
			...current,
			isZoneLoading: true,
		}))

		try {
			const zone = await this.device.zone()
			this.setSnapshot((current) => ({
				...current,
				zone,
				isZoneLoading: false,
			}))
		} catch {
			this.setSnapshot((current) => ({
				...current,
				isZoneLoading: false,
			}))
		}
	}

	/**
	 * Commits a snapshot update and notifies all active subscribers.
	 */
	private setSnapshot = (updater: (current: SoundTouchDeviceStateValue) => SoundTouchDeviceStateValue) => {
		const nextSnapshot = updater(this.snapshot)
		this.snapshot = nextSnapshot
		this.listeners.forEach((listener) => listener())
	}
}

/**
 * Returns the shared state instance for a device host, creating it on first use.
 */
export const getSoundTouchDeviceState = (device: SoundTouchDevice) => {
	const existingState = states.get(device.host)
	if (existingState) {
		existingState.device = device
		return existingState
	}

	const state = new SoundTouchDeviceState(device)
	states.set(device.host, state)
	return state
}

/**
 * Returns the stable empty state value used when no device is selected.
 */
export const getEmptySoundTouchDeviceStateSnapshot = () => EMPTY_SNAPSHOT
