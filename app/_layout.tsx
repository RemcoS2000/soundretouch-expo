import { Stack } from 'expo-router'

import { SettingsProvider } from '../src/state/SettingsContext'
import { SoundTouchDevicesProvider } from '../src/state/SoundTouchDevicesContext'

export default function RootLayout() {
	return (
		<SettingsProvider>
			<SoundTouchDevicesProvider>
				<Stack screenOptions={{ headerShown: false }} />
			</SoundTouchDevicesProvider>
		</SettingsProvider>
	)
}
