import AsyncStorage from '@react-native-async-storage/async-storage'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, useColorScheme } from 'react-native'

import { withArtworkAccent } from '../theme/artwork'
import { darkColors, lightColors, type ThemeColors } from '../theme/colors'

export type SettingsMode = 'system' | 'light' | 'dark'

type Value = {
	mode: SettingsMode
	isDarkMode: boolean
	colors: ThemeColors
	reducedMotion: boolean
	settingsError: string | null
	setMode: (mode: SettingsMode) => void
	toggleDarkMode: () => void
}

const Context = createContext<Value | null>(null)

/**
 * Restores appearance preferences and follows the device reduced-motion setting.
 */
export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
	const system = useColorScheme()
	const [mode, updateMode] = useState<SettingsMode>('system')
	const [reducedMotion, setReducedMotion] = useState(false)
	const [settingsError, setError] = useState<string | null>(null)
	const changed = useRef(false)
	const writes = useRef(Promise.resolve())

	useEffect(() => {
		let active = true

		void AsyncStorage.getItem('soundretouch:theme-mode')
			.then((value) => {
				if (active && !changed.current && (value === 'light' || value === 'dark' || value === 'system')) {
					updateMode(value)
				}
			})
			.catch(() => {
				if (active) {
					setError('Could not read appearance settings.')
				}
			})
		void AccessibilityInfo.isReduceMotionEnabled()
			.then((value) => {
				if (active) {
					setReducedMotion(value)
				}
			})
			.catch(() => undefined)

		const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion)

		return () => {
			active = false
			motion.remove()
		}
	}, [])

	/**
	 * Applies the appearance choice immediately and serializes its persistence write.
	 */
	const setMode = useCallback((value: SettingsMode) => {
		changed.current = true
		updateMode(value)
		setError(null)
		writes.current = writes.current
			.catch(() => undefined)
			.then(() => AsyncStorage.setItem('soundretouch:theme-mode', value))
			.catch(() => setError('Could not save appearance settings. Select the option again to retry.'))
	}, [])

	const isDarkMode = mode === 'dark' || (mode === 'system' && system === 'dark')

	/**
	 * Switches the effective appearance between explicit light and dark modes.
	 */
	const toggleDarkMode = useCallback(() => setMode(isDarkMode ? 'light' : 'dark'), [isDarkMode, setMode])

	const value = useMemo(
		() => ({ mode, isDarkMode, colors: isDarkMode ? darkColors : lightColors, reducedMotion, settingsError, setMode, toggleDarkMode }),
		[mode, isDarkMode, reducedMotion, settingsError, setMode, toggleDarkMode]
	)

	return <Context.Provider value={value}>{children}</Context.Provider>
}

/**
 * Returns appearance tokens, preferences and their update actions.
 */
export function useAppSettings() {
	const value = useContext(Context)

	if (!value) {
		throw new Error('AppSettingsProvider missing')
	}

	return value
}

/**
 * Shares artwork accents while retaining the parent provider's persisted preferences.
 */
export function AppAccentTheme({ source, children }: { source: number | null; children: React.ReactNode }) {
	const settings = useAppSettings()
	const value = useMemo(() => ({ ...settings, colors: withArtworkAccent(settings.colors, source, settings.isDarkMode) }), [settings, source])

	return <Context.Provider value={value}>{children}</Context.Provider>
}
