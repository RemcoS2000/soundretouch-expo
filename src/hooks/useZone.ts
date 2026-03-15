import type { SoundTouchDevice, Zone, ZoneConfig, ZoneSlaveConfig } from '@soundretouch/api/device'

import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'

export const useZone = (device: SoundTouchDevice | null) => {
	const [zone, setZoneState] = useState<Zone>({})
	const [isLoading, setIsLoading] = useState(false)
	const [isUpdating, setIsUpdating] = useState(false)
	const visibleZone = device ? zone : {}
	const visibleIsLoading = device ? isLoading : false
	const visibleIsUpdating = device ? isUpdating : false

	/**
	 * Loads the initial zone payload, subscribes to zone updates,
	 * and refreshes on app resume.
	 */
	useEffect(() => {
		if (!device) return

		let cancelled = false
		let unsubscribe = () => {}

		const load = async () => {
			if (!cancelled) setIsLoading(true)
			try {
				const payload = await device.zone()
				if (!cancelled) setZoneState(payload)
			} catch {
				if (!cancelled) setZoneState({})
			} finally {
				if (!cancelled) setIsLoading(false)
			}
		}

		const subscribe = () => {
			unsubscribe()
			unsubscribe = device.onZoneUpdated(() => {
				if (cancelled) return
				void load()
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
	}, [device])

	/**
	 * Exposes a callback to create or replace the full zone configuration.
	 */
	const setZone = useCallback(
		async (config: ZoneConfig) => {
			if (!device) return
			setIsUpdating(true)
			try {
				await device.setZone(config)
			} catch {
				// Ignore update failures for now.
			} finally {
				setIsUpdating(false)
			}
		},
		[device]
	)

	/**
	 * Exposes a callback to add one or more members to the active zone.
	 */
	const addZoneSlave = useCallback(
		async (config: ZoneSlaveConfig) => {
			if (!device) return
			setIsUpdating(true)
			try {
				await device.addZoneSlave(config)
			} catch {
				// Ignore update failures for now.
			} finally {
				setIsUpdating(false)
			}
		},
		[device]
	)

	/**
	 * Exposes a callback to remove one or more members from the active zone.
	 */
	const removeZoneSlave = useCallback(
		async (config: ZoneSlaveConfig) => {
			if (!device) return
			setIsUpdating(true)
			try {
				await device.removeZoneSlave(config)
			} catch {
				// Ignore update failures for now.
			} finally {
				setIsUpdating(false)
			}
		},
		[device]
	)

	/**
	 * Derives whether this device participates in a zone and whether it is
	 * the master or a slave member.
	 */
	const zoneMembers = !visibleZone.member ? [] : Array.isArray(visibleZone.member) ? visibleZone.member : [visibleZone.member]
	const zoneMasterMac = visibleZone.master?.toUpperCase()
	const selfMember = zoneMembers.find((member) => member.ipaddress === device?.host)
	const selfMemberMac = selfMember?.macAddress?.toUpperCase()
	const isInZone = Boolean(zoneMasterMac && selfMember)
	const isZoneMaster = isInZone && zoneMasterMac === selfMemberMac
	const isZoneSlave = isInZone && zoneMasterMac !== selfMemberMac

	return {
		zone: visibleZone,
		isInZone,
		isZoneMaster,
		isZoneSlave,
		isLoading: visibleIsLoading,
		isUpdating: visibleIsUpdating,
		setZone,
		addZoneSlave,
		removeZoneSlave,
	}
}
