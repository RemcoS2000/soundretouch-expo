import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { NowPlaying } from '@soundretouch/api/device'

import React, { useEffect, useRef, useState } from 'react'
import { Animated, BackHandler, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'

import { useActiveSpeaker } from '../../state/ActiveSpeakerContext'
import { useAppSettings } from '../../state/AppSettingsContext'
import { type SoundTouchDeviceEntry, useSoundTouchDevices } from '../../state/SoundTouchDevicesContext'
import { tokens } from '../../theme/tokens'
import { speakerId } from '../speakers/identity'
import { useSpeakerResource } from '../speakers/queries'

import { PlaybackArtwork } from './PlaybackArtwork'
import { compactTitle } from './playbackMetadata'

/**
 * Shows a speaker's current playback only while its selection menu is open.
 */
function SpeakerOption({ entry, selected, onPress }: { entry: SoundTouchDeviceEntry; selected: boolean; onPress: () => void }) {
	const { colors } = useAppSettings()
	const { data } = useSpeakerResource(entry.device, 'nowPlaying')
	const { artwork, name, detail } = speakerOptionDetails(entry, data)
	const background = selected ? colors.accentSurface : 'transparent'
	const textColor = selected ? colors.onAccentSurface : colors.text
	const detailColor = selected ? colors.onAccentSurface : colors.textMuted

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`Select ${name}${selected ? ', selected' : ''}`}
			accessibilityState={{ selected }}
			onPress={onPress}
			style={({ pressed }) => ({
				minHeight: 72,
				padding: 12,
				flexDirection: 'row',
				alignItems: 'center',
				gap: 12,
				borderRadius: 12,
				backgroundColor: pressed && !selected ? colors.surfaceActive : background,
			})}
		>
			<PlaybackArtwork url={artwork} style={{ width: 40, height: 40, borderRadius: 8 }} transition={150} />
			<View style={{ flex: 1, minWidth: 0, gap: 4 }}>
				<Text numberOfLines={1} style={{ color: textColor, fontSize: 16, fontWeight: '600' }}>
					{name}
				</Text>
				<Text numberOfLines={1} style={{ color: detailColor, fontSize: 13 }}>
					{detail}
				</Text>
			</View>
			{selected && <MaterialIcons name="check" size={22} color={colors.onAccentSurface} />}
		</Pressable>
	)
}

/** Resolves absent metadata once before rendering the selection row. */
function speakerOptionDetails(entry: SoundTouchDeviceEntry, data: NowPlaying | undefined) {
	return { artwork: data?.art?.url, name: entry.info?.name ?? 'SoundTouch speaker', detail: compactTitle(data, entry.info?.type || 'Speaker') }
}

/**
 * Reveals speaker choices beneath the header without moving the player or opening a route.
 * Closing releases playback subscriptions once the dropdown animation finishes.
 */
export function SpeakerDropdown({
	open,
	progress,
	top,
	onClose,
	onAdd,
}: {
	open: boolean
	progress: Animated.Value
	top: number
	onClose: () => void
	onAdd: () => void
}) {
	const { devices } = useSoundTouchDevices()
	const { activeId, selectSpeaker } = useActiveSpeaker()
	const { colors, reducedMotion } = useAppSettings()
	const { height } = useWindowDimensions()
	const [mounted, setMounted] = useState(open)
	const menuRef = useRef<React.ElementRef<typeof View>>(null)
	// Include list padding, the add action and both border pixels to avoid tiny overflow.
	const menuHeight = Math.min(devices.length * 72 + 82, Math.max(152, height - top - 32), 440)

	if (open && !mounted) {
		setMounted(true)
	}

	useEffect(() => {
		const animation = Animated.timing(progress, {
			toValue: open ? 1 : 0,
			duration: reducedMotion ? 0 : tokens.motion.fast,
			useNativeDriver: false,
		})

		animation.start(({ finished }) => {
			if (finished && !open) {
				setMounted(false)
			}
		})

		return () => animation.stop()
	}, [open, progress, reducedMotion])

	useEffect(() => {
		if (!open) {
			return
		}

		const back = BackHandler.addEventListener('hardwareBackPress', () => {
			onClose()

			return true
		})
		/**
		 * Dismisses speaker selection on Escape without navigating away.
		 */
		const escape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault()
				onClose()
			}
		}

		if (Platform.OS === 'web') {
			document.addEventListener('keydown', escape)
		}

		return () => {
			back.remove()

			if (Platform.OS === 'web') {
				document.removeEventListener('keydown', escape)
			}
		}
	}, [open, onClose])

	useEffect(() => {
		if (Platform.OS === 'web' && open && mounted) {
			;(menuRef.current as unknown as HTMLElement)?.querySelector<HTMLElement>('[role="button"]')?.focus()
		}
	}, [open, mounted])

	if (!mounted) {
		return null
	}

	return (
		<View pointerEvents={open ? 'box-none' : 'none'} style={{ position: 'absolute', top, bottom: 0, left: 0, right: 0, zIndex: 40 }}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Close speaker selection"
				onPress={onClose}
				style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
			/>
			<View
				pointerEvents="box-none"
				style={{ width: '100%', maxWidth: tokens.layout.contentWidth, alignSelf: 'center', paddingHorizontal: tokens.layout.gutter }}
			>
				<Animated.View
					ref={menuRef}
					accessibilityElementsHidden={!open}
					importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
					aria-hidden={!open}
					style={{
						height: progress.interpolate({ inputRange: [0, 1], outputRange: [0, menuHeight] }),
						opacity: progress,
						transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
						backgroundColor: colors.surfaceElevated,
						borderRadius: 20,
						borderWidth: 1,
						borderColor: colors.border,
						overflow: 'hidden',
						elevation: 8,
						boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
					}}
				>
					<ScrollView
						style={{ flex: 1 }}
						contentContainerStyle={{ padding: 8 }}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
						showsHorizontalScrollIndicator={false}
					>
						{devices.map((entry) => {
							const id = speakerId(entry.device.host, entry.info)

							return (
								<SpeakerOption
									key={id}
									entry={entry}
									selected={id === activeId}
									onPress={() => {
										onClose()
										selectSpeaker(id)
									}}
								/>
							)
						})}
					</ScrollView>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Add speaker"
						onPress={onAdd}
						style={({ pressed }) => ({
							minHeight: 64,
							paddingHorizontal: 20,
							flexDirection: 'row',
							alignItems: 'center',
							gap: 12,
							borderTopWidth: 1,
							borderColor: colors.border,
							backgroundColor: pressed ? colors.surfaceActive : 'transparent',
						})}
					>
						<MaterialIcons name="add" size={24} color={colors.text} />
						<Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Add speaker</Text>
					</Pressable>
				</Animated.View>
			</View>
		</View>
	)
}
