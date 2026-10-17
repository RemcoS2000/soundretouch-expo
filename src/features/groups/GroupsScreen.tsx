import type { SoundTouchDevice } from '@soundretouch/api/device'

import { useLocalSearchParams } from 'expo-router'
import React from 'react'

import { DismissButton, errorMessage, Loading, Notice, Screen } from '../../design-system/Screen'
import { useSoundTouchDevices } from '../../state/SoundTouchDevicesContext'
import type { SoundTouchDeviceEntry } from '../../state/SoundTouchDevicesContext'
import { reportAsync } from '../../utils/async'
import { speakerId } from '../speakers/identity'

import { GroupMembership } from './GroupMembership'
import { useGroupModel } from './useGroupModel'

/**
 * Shows current group membership, eligible speakers and individual volume controls.
 */
export function GroupControls({ entry: selectedEntry, showSelectedVolume = true }: { entry: SoundTouchDeviceEntry; showSelectedVolume?: boolean }) {
	const { inspection, mutation, masterError, master, selected, snapshots } = useGroupModel(selectedEntry)
	const volumeVisible = (device: SoundTouchDevice) => showSelectedVolume || device !== selectedEntry.device

	return (
		<>
			{inspection.isLoading && <Loading />}
			<Notice
				message={masterError ?? errorMessage(inspection.error ?? mutation.error)}
				retry={() => {
					reportAsync(inspection.refetch())
				}}
			/>
			<Notice message={mutation.data} />
			<Notice message={inspection.data?.excluded.join('\n')} />
			{!selectedEntry && <Notice message="This speaker is no longer saved." />}
			{master && !masterError && (
				<GroupMembership master={master} selected={selected} snapshots={snapshots} mutation={mutation} volumeVisible={volumeVisible} />
			)}
		</>
	)
}

/**
 * Preserves the direct group route while sharing the same controls with the player sheet.
 */
export default function GroupsScreen() {
	const { id } = useLocalSearchParams<{ id: string }>()
	const { devices } = useSoundTouchDevices()
	const entry = devices.find((item) => speakerId(item.device.host, item.info) === id)

	return (
		<Screen title="Speaker group">
			{entry ? <GroupControls entry={entry} /> : <Notice message="This speaker is no longer saved." />}
			<DismissButton />
		</Screen>
	)
}
