import MaterialIcons from '@expo/vector-icons/MaterialIcons'

import React from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import { useAppSettings } from '../../state/AppSettingsContext'
import type { ThemeColors } from '../../theme/colors'

type SheetActionProps = {
	label: string
	detail?: string | undefined
	icon: React.ComponentProps<typeof MaterialIcons>['name']
	onPress: () => void
	selected?: boolean
	pending?: boolean
	disabled?: boolean
}

/**
 * Presents a compact action with a leading icon and a clear selected or pending state.
 */
export function SheetAction({ label, detail, icon, onPress, selected = false, pending = false, disabled = false }: SheetActionProps) {
	const { colors } = useAppSettings()
	const palette = actionColors(colors, selected)

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`${label}${selected ? ' · Current' : ''}`}
			accessibilityState={{ selected, disabled: disabled || pending, busy: pending }}
			disabled={disabled || pending}
			onPress={onPress}
			style={({ pressed }) => ({
				minHeight: 64,
				paddingHorizontal: 16,
				paddingVertical: 12,
				flexDirection: 'row',
				alignItems: 'center',
				gap: 12,
				borderRadius: 16,
				backgroundColor: pressed && !selected ? colors.surfaceActive : palette.background,
				opacity: disabled && !selected ? 0.5 : 1,
			})}
		>
			<MaterialIcons name={icon} size={24} color={palette.muted} />
			<View style={{ flex: 1, minWidth: 0, gap: 4 }}>
				<Text numberOfLines={1} style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>
					{label}
				</Text>
				{detail && <Text style={{ color: palette.muted, fontSize: 13 }}>{detail}</Text>}
			</View>
			<ActionStatus pending={pending} selected={selected} />
		</Pressable>
	)
}

/**
 * Gives each sheet panel a consistent title and spacing without nested card surfaces.
 */
export function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
	const { colors } = useAppSettings()

	return (
		<View style={{ gap: 12 }}>
			<Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>
				{title}
			</Text>
			{children}
		</View>
	)
}

/** Derives the action's readable colors once for its selected state. */
function actionColors(colors: ThemeColors, selected: boolean) {
	if (selected) {
		return { background: colors.accentSurface, text: colors.onAccentSurface, muted: colors.onAccentSurface }
	}

	return { background: colors.surfaceElevated, text: colors.text, muted: colors.textMuted }
}

/** Gives pending feedback precedence over the confirmed selection mark. */
function ActionStatus({ pending, selected }: { pending: boolean; selected: boolean }) {
	const { colors } = useAppSettings()

	if (pending) {
		return <ActivityIndicator color={colors.text} />
	}

	return selected ? <MaterialIcons name="check" size={22} color={colors.onAccentSurface} /> : null
}
