import type { PresetId, SoundTouchDevice } from '@soundretouch/api/device'

import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { errorMessage, Notice } from '../../design-system/Screen'
import { usePresets } from '../../hooks/usePresets'
import { useAppSettings } from '../../state/AppSettingsContext'
import { reportAsync } from '../../utils/async'

import { SheetSection } from './SheetControls'

/**
 * Shows six numbered preset tiles with independent pending states.
 */
export function PresetPanel({ device }: { device: SoundTouchDevice }) {
	const { presets, mutation, query } = usePresets(device)

	return (
		<SheetSection title="Presets">
			<Notice
				message={errorMessage(query.error ?? mutation.error)}
				retry={() => {
					reportAsync(query.refetch())
				}}
			/>
			<View style={styles.grid}>
				{Array.from({ length: 6 }, (_, index) => {
					const id = (index + 1) as PresetId
					const preset = presets.find((item) => Number(item.id) === id)

					return (
						<PresetTile
							key={id}
							id={id}
							name={preset?.ContentItem?.itemName}
							available={!!preset}
							loading={query.isLoading}
							pending={mutation.isPendingFor(id)}
							onPress={() => mutation.mutate(id)}
						/>
					)
				})}
			</View>
		</SheetSection>
	)
}

type PresetTileProps = {
	id: PresetId
	name: string | undefined
	available: boolean
	loading: boolean
	pending: boolean
	onPress: () => void
}

/** Keeps each preset's label, availability and pending indicator together. */
function PresetTile({ id, name, available, loading, pending, onPress }: PresetTileProps) {
	const { colors } = useAppSettings()

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`${id}. ${loading ? 'Loading preset' : name || 'Empty preset'}`}
			accessibilityState={{ disabled: !available || pending, busy: pending }}
			disabled={!available || pending}
			onPress={onPress}
			style={({ pressed }) => [
				styles.tile,
				{
					borderColor: colors.border,
					backgroundColor: pressed ? colors.surfaceActive : colors.surfaceElevated,
					opacity: available ? 1 : 0.5,
				},
			]}
		>
			{loading || pending ? (
				<ActivityIndicator color={colors.text} style={styles.pending} />
			) : (
				<Text style={[styles.number, { color: colors.textMuted }]}>{id}</Text>
			)}
			<Text numberOfLines={2} style={[styles.label, { color: colors.text }]}>
				{loading ? 'Loading…' : name || 'Empty preset'}
			</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	tile: {
		width: '31%',
		flexGrow: 1,
		minHeight: 108,
		padding: 12,
		borderRadius: 16,
		borderWidth: 1,
		gap: 12,
	},
	pending: {
		alignSelf: 'flex-start',
	},
	number: {
		fontSize: 20,
		fontWeight: '600',
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
	},
})
