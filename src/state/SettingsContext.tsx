import AsyncStorage from '@react-native-async-storage/async-storage'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { darkColors, lightColors, type ThemeColors } from '../theme/colors'

const STORAGE_KEY = 'soundretouch:theme-mode'

type SettingsMode = 'light' | 'dark'

type SettingsContextValue = {
	mode: SettingsMode
	isDarkMode: boolean
	colors: ThemeColors
	toggleDarkMode: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
	const [mode, setMode] = useState<SettingsMode>('light')

	useEffect(() => {
		let cancelled = false
		void (async () => {
			try {
				const stored = await AsyncStorage.getItem(STORAGE_KEY)
				if (!cancelled && (stored === 'light' || stored === 'dark')) {
					setMode(stored)
				}
			} catch {
				// Ignore storage errors and keep default mode.
			}
		})()

		return () => {
			cancelled = true
		}
	}, [])

	const toggleDarkMode = useCallback(() => {
		setMode((current) => {
			const next: SettingsMode = current === 'dark' ? 'light' : 'dark'
			void AsyncStorage.setItem(STORAGE_KEY, next)
			return next
		})
	}, [])

	const value = useMemo(
		() => ({ mode, isDarkMode: mode === 'dark', colors: mode === 'dark' ? darkColors : lightColors, toggleDarkMode }),
		[mode, toggleDarkMode]
	)

	return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
	const context = useContext(SettingsContext)
	if (!context) {
		throw new Error('useSettings must be used within SettingsProvider')
	}
	return context
}
