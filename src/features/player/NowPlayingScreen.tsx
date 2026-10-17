import { useLocalSearchParams, useRouter } from 'expo-router'
import React from 'react'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppBackground } from '../../components/AppBackground'
import { Button, IconButton, Loading, Notice } from '../../design-system/Screen'
import { useActiveSpeaker } from '../../state/ActiveSpeakerContext'
import { useAppSettings } from '../../state/AppSettingsContext'
import { useSoundTouchDevices } from '../../state/SoundTouchDevicesContext'
import { speakerId } from '../speakers/identity'

import { PlayerContent } from './PlayerScreen'

/**
 * Shows the selected speaker player, or guides the user to add their first speaker.
 */
export default function NowPlayingScreen() {
	const { devices, hydrated, error, retryStorage } = useSoundTouchDevices()
	const { activeId } = useActiveSpeaker()
	const { colors } = useAppSettings()
	const insets = useSafeAreaInsets()
	const router = useRouter()
	const { speakers } = useLocalSearchParams<{ speakers?: string }>()
	const active = devices.find((entry) => speakerId(entry.device.host, entry.info) === activeId)

	return (
		<View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
			<AppBackground device={active?.device ?? null} />
			{!active && (
				<View style={{ alignItems: 'flex-end', padding: 16 }}>
					<IconButton label="Open settings" icon="settings" onPress={() => router.push('/settings')} />
				</View>
			)}
			<Notice message={error} retry={retryStorage} />
			{!hydrated && <Loading />}
			{hydrated && active && <PlayerContent key={activeId} entry={active} openSpeakerMenu={speakers === 'open'} />}
			{hydrated && !active && (
				<View style={{ flex: 1, justifyContent: 'center', padding: 32, gap: 12 }}>
					<Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: '600', textAlign: 'center' }}>
						No speakers added
					</Text>
					<Text style={{ color: colors.textMuted, fontSize: 16, textAlign: 'center', marginBottom: 12 }}>Add a speaker to see what’s playing.</Text>
					<Button label="Add a speaker" onPress={() => router.push('/device-manager')} />
				</View>
			)}
		</View>
	)
}
