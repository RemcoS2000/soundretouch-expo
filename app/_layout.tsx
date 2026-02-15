import { Stack } from 'expo-router'

import { SoundTouchDevicesProvider } from '../src/state/SoundTouchDevicesContext'

export default function RootLayout() {
	return (
		<SoundTouchDevicesProvider>
			<Stack screenOptions={{ headerShown: false }} />
		</SoundTouchDevicesProvider>
	)
}
