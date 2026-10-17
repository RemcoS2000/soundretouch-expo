import React from 'react'
import { Text } from 'react-native'

import { AppBackground } from '../../components/AppBackground'
import { Button, Card, Notice, Screen } from '../../design-system/Screen'
import { speakerId } from '../../features/speakers/identity'
import { useActiveSpeaker } from '../../state/ActiveSpeakerContext'
import { type SettingsMode, useAppSettings } from '../../state/AppSettingsContext'
import { useSoundTouchDevices } from '../../state/SoundTouchDevicesContext'

/**
 * Shows persisted appearance choices and local-network connection guidance.
 */
export default function AppSettingsScreen() {
	const { mode, setMode, colors, settingsError } = useAppSettings()
	const { devices, error, retryStorage } = useSoundTouchDevices()
	const { activeId } = useActiveSpeaker()
	const active = devices.find((entry) => speakerId(entry.device.host, entry.info) === activeId)

	return (
		<Screen back title="Settings" background={<AppBackground device={active?.device ?? null} />}>
			<Card>
				<Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>
					Appearance
				</Text>
				{(['system', 'light', 'dark'] as SettingsMode[]).map((option) => (
					<Button
						key={option}
						label={option === 'system' ? 'Follow device appearance' : `${option === 'light' ? 'Light' : 'Dark'} mode`}
						secondary
						selected={mode === option}
						onPress={() => setMode(option)}
					/>
				))}
				<Notice message={settingsError} />
			</Card>
			<Card>
				<Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>
					Connection
				</Text>
				<Text style={{ color: colors.textMuted, fontSize: 16 }}>{devices.length} saved speaker(s). Control stays on your local network.</Text>
				<Text style={{ color: colors.textMuted }}>
					Keep your speakers and this device on the same local network. Internet access is not required for local controls.
				</Text>
				<Notice message={error} retry={retryStorage} />
			</Card>
		</Screen>
	)
}
