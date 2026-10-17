import { useMutation, useQuery } from '@tanstack/react-query'

import { errorMessage } from '../../design-system/Screen'
import { type SoundTouchDeviceEntry, useSoundTouchDevices } from '../../state/SoundTouchDevicesContext'
import { reportAsync } from '../../utils/async'
import { speakerId } from '../speakers/identity'

import { changeGroup, inspectGroups, resolveMaster, zoneMembers } from './groups'

/** Fetches group state and reports master resolution failures before enabling membership actions. */
export function useGroupModel(selectedEntry: SoundTouchDeviceEntry) {
	const { devices, foreground } = useSoundTouchDevices()

	const inspection = useQuery({
		queryKey: ['group-inspection', devices.map((item) => speakerId(item.device.host, item.info)).join(',')],
		queryFn: () => inspectGroups(devices),
		enabled: !!selectedEntry && foreground,
		staleTime: 0,
	})

	const mutation = useMutation({
		mutationFn: ({ action, target }: { action: 'add' | 'remove' | 'everywhere' | 'ungroup' | 'leave'; target?: string | undefined }) =>
			changeGroup(devices, selectedEntry, action, target),
		onSettled: () => {
			reportAsync(inspection.refetch())
		},
	})

	const snapshots = inspection.data?.available ?? []
	const selected = snapshots.find((item) => item.entry.device === selectedEntry?.device)
	let master = selected
	let masterError: string | null = null

	if (selected) {
		try {
			master = resolveMaster(selected, snapshots)
		} catch (error) {
			masterError = errorMessage(error)
		}
	}

	const members = master ? zoneMembers(master.zone) : []

	return { inspection, mutation, snapshots, selected, master, masterError, members }
}
