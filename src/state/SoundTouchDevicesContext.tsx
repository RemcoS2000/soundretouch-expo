import AsyncStorage from '@react-native-async-storage/async-storage'
import { type DeviceInfo, SoundTouchDevice } from '@soundretouch/api/device'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { getSoundtouchProxyUrl } from '../utils/proxy'

const STORAGE_KEY = 'soundtouch-devices-v1'

export type SoundTouchDeviceEntry = {
	device: SoundTouchDevice
	info?: DeviceInfo | null
}

type StoredDeviceEntry = {
	host: string
	info?: DeviceInfo | null
}

type SoundTouchDevicesContextValue = {
	devices: SoundTouchDeviceEntry[]
	addDevice: (entry: SoundTouchDeviceEntry) => void
	removeDevice: (host: string) => void
}

const SoundTouchDevicesContext = createContext<SoundTouchDevicesContextValue | undefined>(undefined)

const toStored = (entry: SoundTouchDeviceEntry): StoredDeviceEntry => ({
	host: entry.device.host,
	info: entry.info ?? null,
})

const fromStored = (entry: StoredDeviceEntry): SoundTouchDeviceEntry => {
	const proxyUrl = getSoundtouchProxyUrl()
	return {
		device: new SoundTouchDevice(entry.host, {
			http: proxyUrl ? { proxyUrl, timeoutMs: 20000 } : { timeoutMs: 20000 },
		}),
		info: entry.info ?? null,
	}
}

/**
 * Provides shared SoundTouch device state across the app and persists it locally.
 */
export function SoundTouchDevicesProvider({ children }: { children: React.ReactNode }) {
	const [devices, setDevices] = useState<SoundTouchDeviceEntry[]>([])
	const [hydrated, setHydrated] = useState(false)

	useEffect(() => {
		let active = true
		AsyncStorage.getItem(STORAGE_KEY)
			.then((raw) => {
				if (!raw || !active) return
				const parsed = JSON.parse(raw) as StoredDeviceEntry[]
				if (Array.isArray(parsed)) {
					setDevices(parsed.map(fromStored))
				}
			})
			.catch(() => undefined)
			.finally(() => {
				if (active) setHydrated(true)
			})
		return () => {
			active = false
		}
	}, [])

	/**
	 * Adds a device entry if it does not already exist.
	 */
	const addDevice = useCallback((entry: SoundTouchDeviceEntry) => {
		setDevices((prev) => {
			if (prev.some((existing) => existing.device.host === entry.device.host)) {
				return prev
			}
			return [...prev, entry]
		})
	}, [])

	/**
	 * Removes a device entry by host.
	 */
	const removeDevice = useCallback((host: string) => {
		setDevices((prev) => prev.filter((entry) => entry.device.host !== host))
	}, [])

	useEffect(() => {
		if (!hydrated) return
		AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(devices.map(toStored))).catch(() => undefined)
	}, [devices, hydrated])

	const value = useMemo(() => ({ devices, addDevice, removeDevice }), [devices, addDevice, removeDevice])

	return <SoundTouchDevicesContext.Provider value={value}>{children}</SoundTouchDevicesContext.Provider>
}

export function useSoundTouchDevices() {
	/**
	 * Access the shared device list and mutators.
	 */
	const context = useContext(SoundTouchDevicesContext)
	if (!context) {
		throw new Error('useSoundTouchDevices must be used within SoundTouchDevicesProvider')
	}
	return context
}
