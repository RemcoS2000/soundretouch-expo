import { QueryClientProvider } from '@tanstack/react-query'

import { Stack } from 'expo-router'

import { queryClient } from '../src/features/speakers/session'
import { AppSettingsProvider } from '../src/state/AppSettingsContext'
import { SoundTouchDevicesProvider } from '../src/state/SoundTouchDevicesContext'

export default function RootLayout() {
	return (
		<AppSettingsProvider>
			<QueryClientProvider client={queryClient}>
				<SoundTouchDevicesProvider>
					<Stack screenOptions={{ headerShown: false }} />
				</SoundTouchDevicesProvider>
			</QueryClientProvider>
		</AppSettingsProvider>
	)
}
