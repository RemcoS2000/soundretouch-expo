import type { SoundTouchDevice, Zone, ZoneConfig, ZoneSlaveConfig } from '@soundretouch/api/device'

import { useCallback, useState } from 'react'

import { useSoundTouchDevice } from './useSoundTouchDevice'

export const useZone = (device: SoundTouchDevice | null) => {
	/**
	 * Exposes zone membership state and the zone mutation actions.
	 */
	const { zone, isZoneLoading } = useSoundTouchDevice(device)
	const [isUpdating, setIsUpdating] = useState(false)
	const zoneMembers = !zone.member ? [] : Array.isArray(zone.member) ? zone.member : [zone.member]
	const zoneMasterMac = zone.master?.toUpperCase()
	const selfMember = zoneMembers.find((member) => member.ipaddress === device?.host)
	const selfMemberMac = selfMember?.macAddress?.toUpperCase()
	const isInZone = Boolean(zoneMasterMac && selfMember)
	const isZoneMaster = isInZone && zoneMasterMac === selfMemberMac
	const isZoneSlave = isInZone && zoneMasterMac !== selfMemberMac
	const setZone = useCallback(
		async (config: ZoneConfig) => {
			if (!device) return
			setIsUpdating(true)
			try {
				await device.setZone(config)
			} finally {
				setIsUpdating(false)
			}
		},
		[device]
	)
	const addZoneSlave = useCallback(
		async (config: ZoneSlaveConfig) => {
			if (!device) return
			setIsUpdating(true)
			try {
				await device.addZoneSlave(config)
			} finally {
				setIsUpdating(false)
			}
		},
		[device]
	)
	const removeZoneSlave = useCallback(
		async (config: ZoneSlaveConfig) => {
			if (!device) return
			setIsUpdating(true)
			try {
				await device.removeZoneSlave(config)
			} finally {
				setIsUpdating(false)
			}
		},
		[device]
	)

	return {
		zone: zone as Zone,
		isInZone,
		isZoneMaster,
		isZoneSlave,
		isLoading: isZoneLoading,
		isUpdating,
		setZone,
		addZoneSlave,
		removeZoneSlave,
	}
}
