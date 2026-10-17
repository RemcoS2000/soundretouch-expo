import type { SoundTouchDevice } from '@soundretouch/api/device'

import React from 'react'
import { Text, View } from 'react-native'

import { Button, Card } from '../../design-system/Screen'
import { useAppSettings } from '../../state/AppSettingsContext'
import { VolumeControl } from '../player/VolumeControl'
import { normalizeId } from '../speakers/identity'

import { canJoin, type GroupSnapshot, zoneMembers } from './groups'
import type { useGroupModel } from './useGroupModel'

type Mutation = ReturnType<typeof useGroupModel>['mutation']
type MembershipProps = {
	master: GroupSnapshot
	selected: GroupSnapshot | undefined
	snapshots: GroupSnapshot[]
	mutation: Mutation
	volumeVisible: (device: SoundTouchDevice) => boolean
}

/** Lists membership actions without mixing discovery failures into individual speaker cards. */
export function GroupMembership({ master, selected, snapshots, mutation, volumeVisible }: MembershipProps) {
	const members = zoneMembers(master.zone)

	return (
		<>
			<MasterCard master={master} selected={selected} mutation={mutation} volumeVisible={volumeVisible} />
			{members
				.filter(
					(member) =>
						normalizeId(member.macAddress) !== master.member.macAddress &&
						!snapshots.some((item) => item.member.macAddress === normalizeId(member.macAddress))
				)
				.map((member) => (
					<UnavailableMember key={member.macAddress ?? member.ipaddress} member={member} mutation={mutation} />
				))}
			{snapshots
				.filter((item) => item !== master)
				.map((item) => (
					<AvailableMember key={item.member.macAddress} item={item} master={master} mutation={mutation} volumeVisible={volumeVisible} />
				))}
		</>
	)
}

/** Keeps master playback ownership separate from each speaker's volume target. */
function MasterCard({ master, selected, mutation, volumeVisible }: Omit<MembershipProps, 'snapshots'>) {
	const { colors } = useAppSettings()
	const members = zoneMembers(master.zone)

	return (
		<Card>
			<Text style={{ color: colors.text, fontSize: 24, fontWeight: '600' }}>{master.info.name ?? 'Group master'}</Text>
			<Text style={{ color: colors.textMuted }}>Playback starts here. Volume is controlled separately for each speaker.</Text>
			{volumeVisible(master.entry.device) && <VolumeControl device={master.entry.device} />}
			<Button label="Play everywhere" disabled={mutation.isPending} onPress={() => mutation.mutate({ action: 'everywhere' })} />
			{selected === master ? (
				<Button
					label="Ungroup all speakers"
					secondary
					disabled={mutation.isPending || members.length < 2}
					onPress={() => mutation.mutate({ action: 'ungroup' })}
				/>
			) : (
				<Button label="Leave this group" secondary disabled={mutation.isPending} onPress={() => mutation.mutate({ action: 'leave' })} />
			)}
		</Card>
	)
}

/** Allows a reported but unreachable member to leave without pretending volume is available. */
function UnavailableMember({ member, mutation }: { member: ReturnType<typeof zoneMembers>[number]; mutation: Mutation }) {
	const { colors } = useAppSettings()

	return (
		<Card>
			<Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>Speaker {member.macAddress}</Text>
			<Text style={{ color: colors.textMuted }}>Group member at {member.ipaddress}. Not saved or currently unreachable; volume is unavailable.</Text>
			<Button
				label="Remove unavailable member"
				secondary
				disabled={mutation.isPending || !member.macAddress || !member.ipaddress}
				onPress={() => mutation.mutate({ action: 'remove', target: member.macAddress })}
			/>
		</Card>
	)
}

/** Shows join eligibility and local volume for one saved speaker. */
function AvailableMember({ item, master, mutation, volumeVisible }: Omit<MembershipProps, 'selected' | 'snapshots'> & { item: GroupSnapshot }) {
	const { colors } = useAppSettings()
	const joined = zoneMembers(master.zone).some((member) => normalizeId(member.macAddress) === item.member.macAddress)
	const eligible = canJoin(master, item)
	const availability = eligible ? 'Available to join' : 'Belongs to another group. Remove it there first.'

	return (
		<Card>
			<View>
				<Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{item.info.name ?? item.entry.device.host}</Text>
				<Text style={{ color: colors.textMuted, marginTop: 8 }}>{joined ? 'Group member' : availability}</Text>
			</View>
			{joined && volumeVisible(item.entry.device) && <VolumeControl device={item.entry.device} />}
			<Button
				label={joined ? 'Remove from group' : 'Add to group'}
				secondary
				disabled={mutation.isPending || (!joined && !eligible)}
				onPress={() => mutation.mutate({ action: joined ? 'remove' : 'add', target: item.member.macAddress })}
			/>
		</Card>
	)
}
