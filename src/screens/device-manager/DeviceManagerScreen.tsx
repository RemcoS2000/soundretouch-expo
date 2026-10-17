import React, { useState } from 'react'
import { Alert, Platform, Text, View } from 'react-native'

import { AppBackground } from '../../components/AppBackground'
import { Button, Card, Loading, Notice, Screen } from '../../design-system/Screen'
import { normalizeId, speakerId } from '../../features/speakers/identity'
import { useDeviceDiscovery } from '../../hooks/useDeviceDiscovery'
import { AddDeviceManualModal } from '../../modals/AddDeviceManualModal'
import { useActiveSpeaker } from '../../state/ActiveSpeakerContext'
import { useAppSettings } from '../../state/AppSettingsContext'
import { useSoundTouchDevices } from '../../state/SoundTouchDevicesContext'

/**
 * Manages saved speakers through manual verification and native discovery.
 */
export default function DeviceManagerScreen() {
	const { devices, addDevice, removeDevice, hydrated, error, retryStorage } = useSoundTouchDevices()
	const { colors } = useAppSettings()
	const { activeId } = useActiveSpeaker()
	const discovery = useDeviceDiscovery()
	const [manual, setManual] = useState(false)
	const active = devices.find((entry) => speakerId(entry.device.host, entry.info) === activeId)

	/**
	 * Confirms removal before deleting the saved speaker record.
	 */
	const remove = (host: string, name: string) => {
		if (Platform.OS === 'web') {
			if (window.confirm(`Remove ${name} from this app?`)) {
				removeDevice(host)
			}
		} else {
			Alert.alert('Remove speaker?', `Remove ${name} from this app?`, [
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Remove', style: 'destructive', onPress: () => removeDevice(host) },
			])
		}
	}

	return (
		<Screen back title="Your speakers" background={<AppBackground device={active?.device ?? null} />}>
			<Notice message={error} retry={retryStorage} />
			{!hydrated && <Loading />}
			{devices.map((entry) => (
				<Card key={entry.device.host}>
					<Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{entry.info?.name ?? 'SoundTouch speaker'}</Text>
					<Text selectable style={{ color: colors.textMuted }}>
						{entry.device.host} · {entry.info?.type}
					</Text>
					<Button
						label={`Remove ${entry.info?.name ?? 'speaker'}`}
						secondary
						disabled={!hydrated}
						onPress={() => remove(entry.device.host, entry.info?.name ?? 'speaker')}
					/>
				</Card>
			))}
			<Card>
				<Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>
					Find your speakers
				</Text>
				<Text style={{ color: colors.textMuted, fontSize: 16 }}>Speakers must already be connected to the same network.</Text>
				<Button label="Add by IP or hostname" disabled={!hydrated} onPress={() => setManual(true)} />
				<Button
					label={discovery.status === 'scanning' ? 'Stop scanning' : 'Scan local network'}
					secondary
					disabled={!hydrated || !discovery.supported}
					onPress={discovery.status === 'scanning' ? discovery.stop : discovery.start}
				/>
				{discovery.status === 'scanning' && <Loading />}
				<Notice message={discoveryMessage(discovery.status, discovery.results.length)} />
				{discovery.results.map((entry) => {
					const saved = devices.find((item) => normalizeId(item.info?.deviceID) === normalizeId(entry.info?.deviceID))
					const added = saved?.device.host === entry.device.host
					const addLabel = saved ? 'Update speaker address' : 'Add speaker'

					return (
						<View key={entry.info?.deviceID} style={{ padding: 16, borderRadius: 12, backgroundColor: colors.surface }}>
							<Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{entry.info?.name ?? 'SoundTouch speaker'}</Text>
							<Text style={{ color: colors.textMuted }}>{entry.device.host}</Text>
							<Button label={added ? 'Already added' : addLabel} secondary disabled={added || !hydrated} onPress={() => addDevice(entry)} />
						</View>
					)
				})}
			</Card>
			<Card>
				<Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>New speaker Wi-Fi setup</Text>
				<Text style={{ color: colors.textMuted }}>
					Wi-Fi provisioning is not available yet. Connect the speaker to your network before adding it here.
				</Text>
			</Card>
			<AddDeviceManualModal visible={manual} onClose={() => setManual(false)} />
		</Screen>
	)
}

/**
 * Keeps discovery feedback separate from the speaker-management layout.
 */
function discoveryMessage(status: string, count: number): string | null {
	if (status === 'error') {
		return 'Could not scan. Allow local network access and retry, or add a speaker manually.'
	}
	if (status === 'complete' && count === 0) {
		return 'No speakers found. Check the network, then retry or add manually.'
	}

	return null
}
