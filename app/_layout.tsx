import { Stack } from 'expo-router'

import { AppSettingsProvider } from '../src/state/AppSettingsContext'
import { SoundTouchDevicesProvider } from '../src/state/SoundTouchDevicesContext'

export default function RootLayout() {
	return (
		<AppSettingsProvider>
			<SoundTouchDevicesProvider>
				<Stack screenOptions={{ headerShown: false }} />
			</SoundTouchDevicesProvider>
		</AppSettingsProvider>
	)
}
