import type { SoundTouchDevice, Volume } from '@soundretouch/api/device'

import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'

const clampVolume = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

export const useVolume = (device: SoundTouchDevice | null) => {
	const [volume, setVolumeState] = useState(0)
	const [muteEnabled, setMuteEnabled] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [isUpdating, setIsUpdating] = useState(false)
	const visibleVolume = device ? volume : 0
	const visibleMuteEnabled = device ? muteEnabled : false
	const visibleIsLoading = device ? isLoading : false
	const visibleIsUpdating = device ? isUpdating : false

	const applyVolume = useCallback((payload: Volume) => {
		const nextVolume = payload.actualvolume ?? payload.targetvolume
		if (typeof nextVolume === 'number') {
			setVolumeState(clampVolume(nextVolume))
		}
		if (typeof payload.muteenabled === 'boolean') {
			setMuteEnabled(payload.muteenabled)
		}
	}, [])

	useEffect(() => {
		if (!device) return

		let cancelled = false
		let unsubscribe = () => {}

		const load = async () => {
			if (!cancelled) setIsLoading(true)
			try {
				const currentVolume = await device.volume()
				if (!cancelled) applyVolume(currentVolume)
			} catch {
				// Ignore refresh errors for now.
			} finally {
				if (!cancelled) setIsLoading(false)
			}
		}

		const subscribe = () => {
			unsubscribe()
			unsubscribe = device.onVolumeUpdated((payload) => {
				if (!cancelled) applyVolume(payload)
			})
		}

		subscribe()
		void load()

		const appStateSubscription = AppState.addEventListener('change', async (state) => {
			if (state === 'active') {
				subscribe()
				await load()
			}
		})

		return () => {
			cancelled = true
			appStateSubscription.remove()
			unsubscribe()
		}
	}, [device, applyVolume])

	const setVolume = useCallback(
		async (value: number) => {
			if (!device) return
			const normalized = clampVolume(value)
			setVolumeState(normalized)
			setIsUpdating(true)
			try {
				await device.setVolume(normalized, false)
			} catch {
				// Ignore update errors for now.
			} finally {
				setIsUpdating(false)
			}
		},
		[device]
	)

	return {
		volume: visibleVolume,
		muteEnabled: visibleMuteEnabled,
		isLoading: visibleIsLoading,
		isUpdating: visibleIsUpdating,
		setVolume,
	}
}
