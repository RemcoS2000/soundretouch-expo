import MaterialIcons from '@expo/vector-icons/MaterialIcons'

import React from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'

import { useAppSettings } from '../../state/AppSettingsContext'

type SpeakerSelectorProps = {
	name: string
	onPress: () => void
	expanded: boolean
	progress: Animated.Value
}

/**
 * Preserves speaker selection while the mobile player transitions into its compact view.
 */
export function SpeakerSelector({ name, onPress, expanded, progress }: SpeakerSelectorProps) {
	const { colors } = useAppSettings()

	return (
		<View style={styles.container}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Choose speaker"
				accessibilityState={{ expanded }}
				aria-expanded={expanded}
				onPress={onPress}
				style={styles.trigger}
			>
				<Text style={[styles.caption, { color: colors.textMuted }]}>NOW PLAYING</Text>
				<View style={styles.nameRow}>
					<Text style={[styles.name, { color: colors.text }]}>{name}</Text>
					<Animated.View style={{ transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
						<MaterialIcons name="expand-more" size={20} color={colors.textMuted} />
					</Animated.View>
				</View>
			</Pressable>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 20,
	},
	trigger: {
		minHeight: 48,
		justifyContent: 'center',
	},
	caption: {
		fontSize: 12,
		marginBottom: 4,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	name: {
		flexShrink: 1,
		fontSize: 18,
		fontWeight: '600',
	},
})
