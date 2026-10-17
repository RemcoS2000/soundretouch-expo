import type { SoundTouchDevice } from '@soundretouch/api/device'
import { focusManager } from '@tanstack/react-query'

import * as Network from 'expo-network'
import { type RefObject, useEffect, useState } from 'react'
import { AppState, Platform } from 'react-native'

import { setSessionsForeground } from '../features/speakers/session'

/** Aligns speaker sessions and query focus with app visibility, without requiring internet access. */
export function useSpeakerLifecycle(devicesRef: RefObject<readonly { device: SoundTouchDevice }[]>) {
	const [foreground, setForeground] = useState(AppState.currentState !== 'background')

	// Internet reachability does not gate LAN access; network changes restart active sessions.
	useEffect(() => {
		/**
		 * Keeps React Query focus and speaker sessions aligned with app visibility.
		 */
		const change = (active: boolean) => {
			setForeground(active)
			focusManager.setFocused(active)
			setSessionsForeground(
				active,
				devicesRef.current.map((entry) => entry.device)
			)
		}

		const app = AppState.addEventListener('change', (state) => change(state === 'active'))
		const network = Network.addNetworkStateListener(() => {
			const active = Platform.OS === 'web' ? document.visibilityState === 'visible' : AppState.currentState === 'active'

			if (active) {
				setSessionsForeground(
					false,
					devicesRef.current.map((entry) => entry.device)
				)
				change(true)
			}
		})

		/**
		 * Forwards browser visibility changes to the shared lifecycle policy.
		 */
		const visibility = () => change(document.visibilityState === 'visible')

		if (Platform.OS === 'web') {
			document.addEventListener('visibilitychange', visibility)
		}

		return () => {
			app.remove()
			network.remove()

			if (Platform.OS === 'web') {
				document.removeEventListener('visibilitychange', visibility)
			}
		}
	}, [devicesRef])

	return foreground
}
