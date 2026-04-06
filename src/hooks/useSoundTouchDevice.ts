import type { SoundTouchDevice } from '@soundretouch/api/device'

import { useEffect, useSyncExternalStore } from 'react'

import { getEmptySoundTouchDeviceStateSnapshot, getSoundTouchDeviceState } from '../state/SoundTouchDeviceState'

export const useSoundTouchDevice = (device: SoundTouchDevice | null) => {
	/**
	 * Retains the shared device state while at least one hook consumer is mounted.
	 */
	useEffect(() => {
		if (!device) return
		const state = getSoundTouchDeviceState(device)
		state.retain()
		return () => {
			state.release()
		}
	}, [device])

	/**
	 * Subscribes React to the shared snapshot for this device.
	 */
	const deviceState = useSyncExternalStore(
		(listener) => {
			if (!device) return () => {}
			return getSoundTouchDeviceState(device).subscribe(listener)
		},
		() => {
			if (!device) return getEmptySoundTouchDeviceStateSnapshot()
			return getSoundTouchDeviceState(device).getSnapshot()
		}
	)

	/**
	 * Exposes a stable empty shape when no device is selected.
	 */
	if (!device) {
		return deviceState
	}

	/**
	 * Exposes the shared device state snapshot.
	 */
	return deviceState
}
