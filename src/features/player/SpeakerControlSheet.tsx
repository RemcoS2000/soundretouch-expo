import MaterialIcons from '@expo/vector-icons/MaterialIcons'

import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { type Animated, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomSheet } from '../../components/BottomSheet'
import { useAppSettings } from '../../state/AppSettingsContext'
import type { SoundTouchDeviceEntry } from '../../state/SoundTouchDevicesContext'
import { GroupControls } from '../groups/GroupsScreen'

import { PowerControl } from './PowerControl'
import { PresetPanel } from './PresetPanel'
import { SheetAction, SheetSection } from './SheetControls'
import { SourcePanel } from './SourcePanel'
import { VolumeControl } from './VolumeControl'

type PanelKeyEvent = {
	key?: string
	nativeEvent?: { key?: string }
	currentTarget: unknown
	preventDefault: () => void
}

/**
 * Keeps speaker configuration in a sliding sheet while the player remains the main screen.
 * Panel content mounts only when expanded, so closed controls do not retrieve extra resources.
 */
export function SpeakerControlSheet({
	entry,
	controller,
	onExpandedChange,
	onCollapsedHeightChange,
	topInset,
	animationProgress,
	modal,
}: {
	entry: SoundTouchDeviceEntry
	controller: SoundTouchDeviceEntry
	onExpandedChange: (expanded: boolean) => void
	onCollapsedHeightChange: (height: number) => void
	topInset?: number | undefined
	animationProgress?: Animated.Value | undefined
	modal?: boolean | undefined
}) {
	const { colors } = useAppSettings()
	const { height } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const router = useRouter()
	const [panel, setPanel] = useState<'source' | 'presets' | 'zone' | 'settings'>('source')

	/**
	 * Moves web keyboard focus and selection together within the panel tabs.
	 */
	const navigatePanels = (event: PanelKeyEvent, index: number) => {
		const destinations: Record<string, number> = {
			ArrowRight: (index + 1) % PANELS.length,
			ArrowLeft: (index + PANELS.length - 1) % PANELS.length,
			Home: 0,
			End: PANELS.length - 1,
		}
		const next = destinations[event.key ?? event.nativeEvent?.key ?? '']

		if (next === undefined) {
			return
		}

		event.preventDefault()
		const selectedPanel = PANELS[next]

		if (!selectedPanel) {
			return
		}

		setPanel(selectedPanel.id)
		if (event.currentTarget instanceof HTMLElement) {
			event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus()
		}
	}

	return (
		<BottomSheet
			footerHeight={80 + insets.bottom}
			bottomInset={insets.bottom}
			screenHeight={height}
			onExpandedChange={onExpandedChange}
			onCollapsedHeightChange={onCollapsedHeightChange}
			topInset={topInset}
			animationProgress={animationProgress}
			modal={modal}
			renderTopContent={({ isExpanded, toggle }) => (
				<Pressable
					onPress={toggle}
					accessibilityRole="button"
					accessibilityLabel={isExpanded ? 'Collapse speaker controls' : 'Expand speaker controls'}
					accessibilityState={{ expanded: isExpanded }}
					style={{
						minHeight: 80 + insets.bottom,
						paddingHorizontal: 24,
						paddingTop: 16,
						paddingBottom: insets.bottom,
						flexDirection: 'row',
						alignItems: 'center',
						gap: 16,
					}}
				>
					<View style={{ flex: 1 }}>
						<Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Speaker controls</Text>
						<Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 4 }}>{entry.info?.name ?? 'SoundTouch speaker'}</Text>
					</View>
					<MaterialIcons name={isExpanded ? 'expand-more' : 'expand-less'} size={24} color={colors.text} />
				</Pressable>
			)}
		>
			<View style={{ gap: 24 }}>
				<VolumeControl device={entry.device} />
				<View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 16, backgroundColor: colors.surfaceActive }}>
					{PANELS.map((item, index) => (
						<Pressable
							key={item.id}
							accessibilityRole="tab"
							accessibilityLabel={item.label}
							accessibilityState={{ selected: panel === item.id }}
							aria-selected={panel === item.id}
							{...(Platform.OS === 'web'
								? { tabIndex: panel === item.id ? 0 : -1, onKeyDown: (event: PanelKeyEvent) => navigatePanels(event, index) }
								: {})}
							onPress={() => setPanel(item.id)}
							style={({ pressed }) => ({
								flex: 1,
								minHeight: 64,
								alignItems: 'center',
								justifyContent: 'center',
								gap: 6,
								paddingVertical: 8,
								borderRadius: 12,
								backgroundColor: panel === item.id ? colors.accentSurface : 'transparent',
								opacity: pressed ? 0.7 : 1,
							})}
						>
							<MaterialIcons name={item.icon} size={22} color={panel === item.id ? colors.onAccentSurface : colors.textMuted} />
							<Text style={{ color: panel === item.id ? colors.onAccentSurface : colors.textMuted, fontSize: 12, fontWeight: '600' }}>
								{item.label}
							</Text>
						</Pressable>
					))}
				</View>
				{panel === 'source' && <SourcePanel device={controller.device} />}
				{panel === 'presets' && <PresetPanel device={controller.device} />}
				{panel === 'zone' && (
					<SheetSection title="Group">
						<GroupControls entry={entry} showSelectedVolume={false} />
					</SheetSection>
				)}
				{panel === 'settings' && (
					<SheetSection title="Speaker">
						<PowerControl device={entry.device} />
						<SheetAction
							label="Manage speakers"
							detail="Add, remove or update speakers"
							icon="speaker"
							onPress={() => router.push('/device-manager')}
						/>
					</SheetSection>
				)}
			</View>
		</BottomSheet>
	)
}

const PANELS = [
	{ id: 'source', label: 'Sources', icon: 'music-note' },
	{ id: 'presets', label: 'Presets', icon: 'apps' },
	{ id: 'zone', label: 'Group', icon: 'speaker-group' },
	{ id: 'settings', label: 'Speaker', icon: 'tune' },
] as const
