import { MaterialIcons } from '@expo/vector-icons'
import type { PresetId, Presets, SoundTouchDevice } from '@soundretouch/api/device'

import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import spotifyIcon from '../../../../assets/images/spotify-icon.png'
import { usePresets } from '../../../hooks/usePresets'
import { useAppSettings } from '../../../state/AppSettingsContext'
import { getSourceIconName } from '../../../utils'

const PRESET_IDS: PresetId[] = [1, 2, 3, 4, 5, 6]

type DevicePresetSelectionProps = {
	device: SoundTouchDevice
	onSelected?: () => void
}

export function DevicePresetSelection({ device, onSelected }: DevicePresetSelectionProps) {
	const { presets, selectPreset } = usePresets(device)
	const { colors } = useAppSettings()
	const slots: Array<Presets[number]> = Array.from({ length: 6 })
	for (const preset of presets) {
		const id = Number(preset.id)
		if (!id) continue
		slots[id - 1] = preset
	}

	return (
		<View style={styles.card}>
			<Text style={[styles.title, { color: colors.textMuted }]}>Presets</Text>
			<View style={styles.grid}>
				{slots.map((preset, index) => {
					const containerArt = (preset?.ContentItem as { containerArt?: unknown } | undefined)?.containerArt
					const containerArtUri = typeof containerArt === 'string' && containerArt.trim().length > 0 ? containerArt : null
					const isSpotify = (preset?.ContentItem?.source ?? '').toUpperCase().includes('SPOTIFY')
					const isEmpty = !preset

					return (
						<TouchableOpacity
							key={`preset-${index + 1}`}
							style={[styles.square, { backgroundColor: colors.surface }, isEmpty ? styles.squareEmpty : null]}
							disabled={isEmpty}
							onPress={() => {
								if (!preset) return
								void (async () => {
									await selectPreset(PRESET_IDS[index])
									onSelected?.()
								})()
							}}
							accessibilityRole="button"
							accessibilityLabel={preset?.ContentItem?.itemName ? `Select preset ${preset.ContentItem.itemName}` : `Select preset ${index + 1}`}
						>
							{containerArtUri ? (
								<Image source={{ uri: containerArtUri }} style={styles.art} />
							) : isSpotify ? (
								<View style={[styles.art, styles.spotifyArtWrap]}>
									<Image source={spotifyIcon} style={styles.spotifyArt} resizeMode="contain" />
								</View>
							) : (
								<View
									style={[
										styles.art,
										styles.artFallback,
										{ backgroundColor: colors.surfaceActive },
										isEmpty ? styles.artFallbackEmpty : null,
									]}
								>
									<MaterialIcons name="music-note" size={16} color={colors.textMuted} />
								</View>
							)}
							<View style={[styles.overlay, isEmpty ? styles.overlayEmpty : null]}>
								<View style={styles.presetNumberWrap}>
									<Text style={styles.presetNumber}>{index + 1}</Text>
								</View>
								{preset?.ContentItem?.source ? (
									<View style={styles.sourceIconWrap}>
										<MaterialIcons name={getSourceIconName(preset.ContentItem.source)} size={14} color="#fff" />
									</View>
								) : null}
								<Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
									{preset?.ContentItem?.itemName ?? ''}
								</Text>
							</View>
						</TouchableOpacity>
					)
				})}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		marginBottom: 12,
	},
	title: {
		marginBottom: 8,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
		color: '#666',
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
	},
	square: {
		width: '32%',
		aspectRatio: 1,
		marginBottom: 8,
		borderRadius: 12,
		backgroundColor: '#f3f4f6',
		overflow: 'hidden',
		position: 'relative',
	},
	squareEmpty: {
		opacity: 0.45,
	},
	art: {
		width: '100%',
		height: '100%',
		backgroundColor: '#e5e7eb',
	},
	artFallback: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	artFallbackEmpty: {
		backgroundColor: '#d1d5db',
	},
	spotifyArtWrap: {
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#e5e7eb',
	},
	spotifyArt: {
		width: '74%',
		height: '74%',
	},
	overlay: {
		...StyleSheet.absoluteFillObject,
		padding: 10,
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(0,0,0,0.22)',
	},
	sourceIconWrap: {
		position: 'absolute',
		top: 8,
		right: 8,
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: 'rgba(0,0,0,0.45)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	presetNumberWrap: {
		position: 'absolute',
		top: 8,
		left: 8,
		minWidth: 20,
		height: 20,
		paddingHorizontal: 6,
		borderRadius: 10,
		backgroundColor: 'rgba(0,0,0,0.45)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	presetNumber: {
		fontSize: 11,
		fontWeight: '700',
		color: '#fff',
	},
	overlayEmpty: {
		backgroundColor: 'rgba(0,0,0,0.06)',
	},
	name: {
		fontSize: 12,
		fontWeight: '600',
		color: '#fff',
	},
})
