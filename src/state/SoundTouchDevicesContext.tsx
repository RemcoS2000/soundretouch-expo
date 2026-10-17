import AsyncStorage from '@react-native-async-storage/async-storage'
import type { DeviceInfo, SoundTouchDevice } from '@soundretouch/api/device'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { createDevice } from '../features/speakers/client'
import { normalizeId, parseSpeakers, speakerId } from '../features/speakers/identity'
import { getSession, registerSession } from '../features/speakers/session'
import { reportAsync } from '../utils/async'

import { useSpeakerLifecycle } from './useSpeakerLifecycle'

const STORAGE_KEY = 'soundtouch-devices-v2'
const LEGACY_KEY = 'soundtouch-devices-v1'

export type SoundTouchDeviceEntry = { device: SoundTouchDevice; info?: DeviceInfo | null }

type ContextValue = {
	devices: SoundTouchDeviceEntry[]
	hydrated: boolean
	error: string | null
	foreground: boolean
	addDevice: (entry: SoundTouchDeviceEntry) => void
	removeDevice: (host: string) => void
	retryStorage: () => void
}

const Context = createContext<ContextValue | undefined>(undefined)

/** Reads and validates storage before the provider applies any state changes. */
async function readSavedSpeakers() {
	const current = await AsyncStorage.getItem(STORAGE_KEY)

	return parseSpeakers(current ?? (await AsyncStorage.getItem(LEGACY_KEY)))
}

/**
 * Owns speaker instances, migrates saved records and serializes persistence writes.
 */
export function SoundTouchDevicesProvider({ children }: { children: React.ReactNode }) {
	const [devices, setDevices] = useState<SoundTouchDeviceEntry[]>([])
	const [hydrated, setHydrated] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const devicesRef = useRef(devices)
	const foreground = useSpeakerLifecycle(devicesRef)

	const writes = useRef<Promise<unknown>>(Promise.resolve())
	const canWrite = useRef(false)
	const mounted = useRef(true)
	const hydrationGeneration = useRef(0)

	/**
	 * Registers one device session and persists confirmed metadata changes.
	 */
	const attach = useCallback((entry: SoundTouchDeviceEntry) => {
		registerSession(entry.device, speakerId(entry.device.host, entry.info), (info) => {
			if (!mounted.current) {
				return
			}

			setDevices((previous) => updatedSpeakerInfo(previous, entry.device, info))
		})

		return entry
	}, [])

	/**
	 * Restores validated records before mutations or writes are enabled.
	 * The legacy storage key remains available until the migrated list is safely written.
	 */
	const hydrate = useCallback(() => {
		const generation = ++hydrationGeneration.current
		/** Only the newest mounted restore may apply results, including after Strict Mode restarts. */
		const isCurrent = () => mounted.current && generation === hydrationGeneration.current

		return readSavedSpeakers()
			.then((stored) => {
				if (!isCurrent()) {
					return
				}

				devicesRef.current.forEach((entry) => getSession(entry.device).dispose())
				const entries = stored.map((entry) => attach({ device: createDevice(entry.host), info: entry.info }))

				devicesRef.current = entries
				setDevices(entries)
				setError(null)
				canWrite.current = true
			})
			.catch((failure: unknown) => {
				if (!isCurrent()) {
					return
				}

				canWrite.current = false
				setError(`Could not read saved speakers: ${failure instanceof Error ? failure.message : 'storage unavailable'}`)
			})
			.finally(() => {
				if (isCurrent()) {
					setHydrated(true)
				}
			})
	}, [attach])

	useEffect(() => {
		mounted.current = true
		reportAsync(hydrate())

		return () => {
			mounted.current = false
			devicesRef.current.forEach((entry) => getSession(entry.device).dispose())
		}
	}, [hydrate])

	useEffect(() => {
		devicesRef.current = devices
	}, [devices])

	/**
	 * Adds a verified speaker or reconciles its changed address using the confirmed device ID.
	 */
	const addDevice = useCallback(
		(entry: SoundTouchDeviceEntry) => {
			if (!hydrated || !canWrite.current) {
				entry.device.dispose()

				return
			}

			const previous = devicesRef.current
			const id = normalizeId(entry.info?.deviceID)
			const same = previous.find((item) => id && normalizeId(item.info?.deviceID) === id)
			const sameHost = previous.find((item) => item.device.host === entry.device.host)

			if (hasIdentityConflict(sameHost, id)) {
				entry.device.dispose()
				setError('A different speaker occupies this address. Remove the old entry before adding it.')

				return
			}

			if (hasSameAddress(same, entry.device.host)) {
				if (same.device !== entry.device) {
					entry.device.dispose()
				}

				return
			}

			const replaced = same ?? sameHost

			if (replaced) {
				getSession(replaced.device).dispose()
			}

			const next = [...previous.filter((item) => item !== replaced), attach(entry)]

			devicesRef.current = next
			setDevices(next)
		},
		[hydrated, attach]
	)

	/**
	 * Removes a saved speaker and releases its session before updating the registry.
	 */
	const removeDevice = useCallback(
		(host: string) => {
			if (!hydrated) {
				return
			}

			const removed = devicesRef.current.find((entry) => entry.device.host === host)

			if (removed) {
				getSession(removed.device).dispose()
			}

			const next = devicesRef.current.filter((entry) => entry.device.host !== host)

			devicesRef.current = next
			setDevices(next)
		},
		[hydrated]
	)

	// Queue storage writes so a slower, older save cannot overwrite a newer speaker list.
	useEffect(() => {
		if (!hydrated || !canWrite.current) {
			return
		}

		const payload = JSON.stringify({ version: 2, devices: devices.map((entry) => ({ host: entry.device.host, info: entry.info ?? null })) })

		writes.current = writes.current
			.catch(() => undefined)
			.then(() => AsyncStorage.setItem(STORAGE_KEY, payload))
			.catch(() => {
				if (mounted.current) {
					setError('Could not save speakers. Your previous saved list is retained. Retry saving before closing the app.')
				}
			})
	}, [devices, hydrated])

	/**
	 * Retries hydration after a read failure, or queues the current list after a write failure.
	 */
	const retryStorage = useCallback(() => {
		if (!canWrite.current) {
			setHydrated(false)
			reportAsync(hydrate())

			return
		}

		setError(null)
		setDevices((previous) => [...previous])
	}, [hydrate])

	const value = useMemo(
		() => ({ devices, hydrated, error, foreground, addDevice, removeDevice, retryStorage }),
		[devices, hydrated, error, foreground, addDevice, removeDevice, retryStorage]
	)

	return <Context.Provider value={value}>{children}</Context.Provider>
}

/**
 * Returns the saved speaker registry and its mutation and storage-recovery actions.
 */
export function useSoundTouchDevices() {
	const context = useContext(Context)

	if (!context) {
		throw new Error('useSoundTouchDevices must be used within SoundTouchDevicesProvider')
	}

	return context
}

/** Applies confirmed metadata while preserving unchanged registry entries. */
function updatedSpeakerInfo(entries: SoundTouchDeviceEntry[], device: SoundTouchDevice, info: DeviceInfo) {
	return entries.map((item) => (item.device === device && JSON.stringify(item.info) !== JSON.stringify(info) ? { ...item, info } : item))
}

/** Rejects replacement when an occupied address reports another confirmed identity. */
function hasIdentityConflict(existing: SoundTouchDeviceEntry | undefined, id: string): boolean {
	const savedId = normalizeId(existing?.info?.deviceID)

	return !!savedId && savedId !== id
}

/** Narrows a matching identity to the instance already saved at this address. */
function hasSameAddress(existing: SoundTouchDeviceEntry | undefined, host: string): existing is SoundTouchDeviceEntry {
	return existing?.device.host === host
}
