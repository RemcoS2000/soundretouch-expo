import { QueryClientProvider } from '@tanstack/react-query'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { queryClient } from '../src/features/speakers/session'
import { ActiveSpeakerProvider } from '../src/state/ActiveSpeakerContext'
import { AppSettingsProvider, useAppSettings } from '../src/state/AppSettingsContext'
import { SoundTouchDevicesProvider } from '../src/state/SoundTouchDevicesContext'

export const unstable_settings = { anchor: 'index' }

/**
 * Composes the app routes within the selected navigation theme.
 */
function Navigation() {
	const { colors, isDarkMode, reducedMotion } = useAppSettings()

	return (
		<>
			<StatusBar style={isDarkMode ? 'light' : 'dark'} />
			<Stack
				screenOptions={{
					headerShown: false,
					contentStyle: { backgroundColor: colors.background },
					animation: reducedMotion ? 'none' : 'default',
					gestureEnabled: true,
				}}
			>
				<Stack.Screen name="index" />
				<Stack.Screen name="speakers" options={{ presentation: 'modal' }} />
				<Stack.Screen name="settings" options={{ presentation: 'modal' }} />
				<Stack.Screen name="device-manager" options={{ presentation: 'modal' }} />
			</Stack>
		</>
	)
}

/**
 * Installs the shared query, settings and speaker providers around app navigation.
 */
export default function RootLayout() {
	return (
		<SafeAreaProvider>
			<AppSettingsProvider>
				<QueryClientProvider client={queryClient}>
					<SoundTouchDevicesProvider>
						<ActiveSpeakerProvider>
							<Navigation />
						</ActiveSpeakerProvider>
					</SoundTouchDevicesProvider>
				</QueryClientProvider>
			</AppSettingsProvider>
		</SafeAreaProvider>
	)
}
