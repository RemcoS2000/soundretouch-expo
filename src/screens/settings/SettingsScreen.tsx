import { useRouter } from 'expo-router'
import React from 'react'
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'

import { AppBackground } from '../../components/AppBackground'
import { useSettings } from '../../state/SettingsContext'

export default function SettingsScreen() {
	const router = useRouter()
	const { isDarkMode, colors, toggleDarkMode } = useSettings()

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<AppBackground device={null} />
			<View style={styles.headerRow}>
				<Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
				<TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close settings">
					<Text style={[styles.closeText, { color: colors.text }]}>Close</Text>
				</TouchableOpacity>
			</View>

			<View style={[styles.card, { backgroundColor: colors.surfaceElevated }]}>
				<View>
					<Text style={[styles.cardTitle, { color: colors.text }]}>Dark mode</Text>
					<Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>Use a darker color theme across the app.</Text>
				</View>
				<Switch value={isDarkMode} onValueChange={toggleDarkMode} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		paddingTop: 60,
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '700',
	},
	closeText: {
		fontWeight: '600',
	},
	card: {
		borderRadius: 16,
		padding: 20,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 12,
		boxShadow: '0px 8px 16px rgba(0,0,0,0.08)',
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: '700',
	},
	cardSubtitle: {
		marginTop: 4,
		fontSize: 13,
	},
})
