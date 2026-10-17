import type { DeviceInfo, Zone, ZoneConfigMember } from '@soundretouch/api/device'

import type { SoundTouchDeviceEntry } from '../../state/SoundTouchDevicesContext'
import { normalizeId } from '../speakers/identity'
import { getSession, queryClient, resourceKey } from '../speakers/session'

export type GroupSnapshot = { entry: SoundTouchDeviceEntry; info: DeviceInfo; zone: Zone; member: ZoneConfigMember }

/**
 * Builds a canonical zone member from the speaker ID and reported network address.
 */
export function networkMember(entry: SoundTouchDeviceEntry, info: DeviceInfo): ZoneConfigMember {
	const networks = Array.isArray(info.networkInfo) ? info.networkInfo : [info.networkInfo].filter((item) => item !== undefined)
	const network =
		networks.find((item) => item.ipAddress === entry.device.host) ?? networks.find((item) => item.ipAddress && /^\d+\.\d+\.\d+\.\d+$/.test(item.ipAddress))
	const ipaddress = network?.ipAddress ?? (/^\d+\.\d+\.\d+\.\d+$/.test(entry.device.host) ? entry.device.host : '')
	const macAddress = normalizeId(info.deviceID)

	if (!ipaddress || !macAddress) {
		throw new Error('Speaker has not reported a usable network address and device ID.')
	}

	return { ipaddress, macAddress }
}

/**
 * Refreshes identity and zone state for saved speakers, reporting unreachable speakers separately.
 */
export async function inspectGroups(entries: SoundTouchDeviceEntry[]): Promise<{ available: GroupSnapshot[]; excluded: string[] }> {
	const results = await Promise.allSettled(
		entries.map(async (entry) => {
			const session = getSession(entry.device)
			const [info, zone] = await Promise.all([
				queryClient.fetchQuery({ queryKey: resourceKey(session.id, 'info'), queryFn: ({ signal }) => session.read('info', signal), staleTime: 0 }),
				queryClient.fetchQuery({ queryKey: resourceKey(session.id, 'zone'), queryFn: ({ signal }) => session.read('zone', signal), staleTime: 0 }),
			])

			return { entry, info, zone, member: networkMember(entry, info) }
		})
	)
	const available: GroupSnapshot[] = []
	const excluded: string[] = []

	results.forEach((result, index) => {
		if (result.status === 'fulfilled') {
			available.push(result.value)
		} else {
			excluded.push(
				`${entries[index]?.info?.name ?? entries[index]?.device.host ?? 'Speaker'}: ${result.reason instanceof Error ? result.reason.message : 'unreachable'}`
			)
		}
	})

	return { available, excluded }
}

/**
 * Normalizes absent, single and multiple zone members into an array.
 */
export const zoneMembers = (zone: Zone) => (Array.isArray(zone.member) ? zone.member : [zone.member].filter((member) => member !== undefined))

/**
 * Resolves a selected group member to its reachable master before changing membership.
 */
export function resolveMaster(selected: GroupSnapshot, snapshots: GroupSnapshot[]) {
	const id = normalizeId(selected.zone.master)

	if (!id || id === selected.member.macAddress) {
		return selected
	}

	const master = snapshots.find((snapshot) => snapshot.member.macAddress === id)

	if (!master) {
		throw new Error('Add the group master to the app and make sure it is reachable before changing this group.')
	}

	return master
}

/**
 * Allows standalone speakers or speakers already belonging to the selected master.
 */
export function canJoin(master: GroupSnapshot, candidate: GroupSnapshot) {
	const current = normalizeId(candidate.zone.master)

	return !current || current === master.member.macAddress
}

/**
 * Applies a membership change through the master device and verifies each affected member afterward.
 *
 * Partial or uncertain results are reported without retrying the command automatically.
 */
export async function changeGroup(
	entries: SoundTouchDeviceEntry[],
	selectedEntry: SoundTouchDeviceEntry,
	action: 'add' | 'remove' | 'everywhere' | 'ungroup' | 'leave',
	targetId?: string
) {
	const inspection = await inspectGroups(entries)
	const selected = inspection.available.find((item) => item.entry.device === selectedEntry.device)

	if (!selected) {
		throw new Error('The selected speaker is unreachable. Retry once it is connected.')
	}

	const master = resolveMaster(selected, inspection.available)
	const ownId = master.member.macAddress
	const excluded = [...inspection.excluded]
	const desired = groupTargets({ action, master, selected, available: inspection.available, excluded, targetId })

	if (!desired.length) {
		return [...excluded, 'No eligible changes were needed.'].join('\n')
	}

	const removing = ['remove', 'ungroup', 'leave'].includes(action)
	let failure: unknown

	try {
		await getSession(master.entry.device).command(async () => {
			if (removing) {
				await master.entry.device.removeZoneSlave({ master: ownId, members: desired })
			} else if (!master.zone.master) {
				await master.entry.device.setZone({ master: ownId, senderIPAddress: master.member.ipaddress, members: [master.member, ...desired] })
			} else {
				await master.entry.device.addZoneSlave({ master: ownId, members: desired })
			}
		}, ['zone', 'nowPlaying'])
	} catch (error) {
		failure = error
	}

	const confirmed = await inspectGroups(entries)
	const masterAfter = confirmed.available.find((item) => item.member.macAddress === ownId)
	const remaining = masterAfter ? zoneMembers(masterAfter.zone).map((item) => normalizeId(item.macAddress)) : null
	const unconfirmed = desired.filter((item) => {
		const speaker = confirmed.available.find((snapshot) => snapshot.member.macAddress === item.macAddress)
		const inZone = remaining?.includes(item.macAddress) && normalizeId(speaker?.zone.master) === ownId

		if (removing) {
			return !speaker || !remaining || remaining.includes(item.macAddress) || normalizeId(speaker.zone.master) === ownId
		}

		return !inZone
	})
	const messages = [...excluded, ...confirmed.excluded]

	if (failure) {
		messages.push('Command outcome uncertain. Check the speaker connection and refresh before trying again.')
	}

	if (unconfirmed.length) {
		messages.push(`${unconfirmed.length} member change(s) could not be confirmed. Refresh before trying again.`)
	} else {
		messages.push('Speaker group updated and verified.')
	}

	return [...new Set(messages)].join('\n')
}

type GroupAction = 'add' | 'remove' | 'everywhere' | 'ungroup' | 'leave'

/** Carries the confirmed membership context into a selection policy. */
type TargetSelection = {
	action: GroupAction
	master: GroupSnapshot
	selected: GroupSnapshot
	available: GroupSnapshot[]
	excluded: string[]
	targetId?: string | undefined
}

/** Selects the membership policy before any device mutation is queued. */
function groupTargets({ action, master, selected, available, excluded, targetId }: TargetSelection): ZoneConfigMember[] {
	switch (action) {
		case 'everywhere':
			return everywhereTargets(master, available, excluded)
		case 'ungroup':
			return ungroupTargets(master, selected)
		case 'remove':
			return removalTargets(master, targetId)
		case 'add':
		case 'leave':
			return individualTarget({ action, master, selected, available, targetId })
	}
}

/**
 * Includes eligible standalone speakers while explaining exclusions from other groups.
 */
function everywhereTargets(master: GroupSnapshot, available: GroupSnapshot[], excluded: string[]): ZoneConfigMember[] {
	const members = zoneMembers(master.zone)

	return available
		.filter((item) => {
			if (!canJoin(master, item)) {
				excluded.push(`${item.info.name ?? item.entry.device.host}: belongs to another group`)

				return false
			}

			return item !== master && !members.some((member) => normalizeId(member.macAddress) === item.member.macAddress)
		})
		.map((item) => item.member)
}

/**
 * Validates every reported member before allowing the master to ungroup it.
 */
function ungroupTargets(master: GroupSnapshot, selected: GroupSnapshot): ZoneConfigMember[] {
	if (selected !== master) {
		throw new Error('Only the master can ungroup all speakers.')
	}

	return zoneMembers(master.zone)
		.filter((item) => normalizeId(item.macAddress) !== master.member.macAddress)
		.map((item) => {
			if (!item.ipaddress || !item.macAddress) {
				throw new Error('A group member has incomplete network information. Refresh before ungrouping.')
			}

			return { ipaddress: item.ipaddress, macAddress: normalizeId(item.macAddress) }
		})
}

/**
 * Resolves removal from the master's zone, including unavailable saved members.
 */
function removalTargets(master: GroupSnapshot, targetId?: string): ZoneConfigMember[] {
	const member = zoneMembers(master.zone).find((item) => normalizeId(item.macAddress) === normalizeId(targetId))

	if (!member?.ipaddress || !member.macAddress) {
		throw new Error('Member details are unavailable. Refresh this group first.')
	}
	if (normalizeId(member.macAddress) === master.member.macAddress) {
		throw new Error('Use Ungroup all to remove the master.')
	}

	return [{ ipaddress: member.ipaddress, macAddress: normalizeId(member.macAddress) }]
}

/**
 * Validates an individual join or leave without moving speakers from another group.
 */
function individualTarget({
	action,
	master,
	selected,
	available,
	targetId,
}: Omit<TargetSelection, 'excluded'> & { action: 'add' | 'leave' }): ZoneConfigMember[] {
	const target = action === 'leave' ? selected : available.find((item) => item.member.macAddress === normalizeId(targetId))

	if (!target) {
		throw new Error('The target speaker is unavailable.')
	}
	if (target === master) {
		throw new Error('Use Ungroup all to remove the master.')
	}
	if (action === 'add' && !canJoin(master, target)) {
		throw new Error('Remove this speaker from its existing group first.')
	}

	return [target.member]
}
