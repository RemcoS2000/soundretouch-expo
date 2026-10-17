import { useIsFocused } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'

import { discoverSoundTouchDevices } from '../discovery/discoverSoundTouchDevices'
import { createDiscoveryBrowser, isDiscoverySupported } from '../discovery/zeroconf'
import { probeSpeaker } from '../features/speakers/client'
import type { SoundTouchDeviceEntry } from '../state/SoundTouchDevicesContext'
import { log } from '../utils/logger'

/**
 * Exposes native discovery results and stops scanning when the screen or app becomes inactive.
 */
export function useDeviceDiscovery() {
	const focused = useIsFocused()
	const [results, setResults] = useState<SoundTouchDeviceEntry[]>([])
	const [status, setStatus] = useState<'idle' | 'scanning' | 'complete' | 'error'>('idle')
	const stopRef = useRef<(() => void) | undefined>(undefined)
	const sessionRef = useRef(0)

	/**
	 * Stops the active browser and releases its cleanup handle.
	 */
	const stop = useCallback(() => {
		stopRef.current?.()
		stopRef.current = undefined
	}, [])

	/**
	 * Begins a fresh supported scan and ignores results from previous sessions.
	 */
	const start = useCallback(() => {
		if (!isDiscoverySupported) {
			return
		}

		stop()

		const session = ++sessionRef.current

		setResults([])
		setStatus('scanning')
		stopRef.current = discoverSoundTouchDevices({
			createBrowser: createDiscoveryBrowser,
			probe: probeSpeaker,
			onDevice: (entry) => {
				if (session === sessionRef.current) {
					setResults((previous) => [...previous, entry])
				}
			},
			onStop: () => {
				if (session === sessionRef.current) {
					setStatus('complete')
				}
			},
			onError: (error) => {
				log.warn('Device discovery failed', error)

				if (session === sessionRef.current) {
					setStatus('error')
				}
			},
		})
	}, [stop])

	/**
	 * Invalidates pending scan callbacks before releasing the browser.
	 */
	const cancelSession = useCallback(() => {
		++sessionRef.current
		stop()
	}, [stop])

	useEffect(() => {
		const subscription = AppState.addEventListener('change', (state) => {
			if (state !== 'active') {
				stop()
			}
		})

		return () => {
			cancelSession()
			subscription.remove()
		}
	}, [stop, cancelSession])

	useEffect(() => {
		if (!focused) {
			cancelSession()
		}
	}, [focused, cancelSession])

	return { results, status, start, stop, supported: isDiscoverySupported }
}
