import type { SoundTouchDevice } from '@soundretouch/api/device'

import React from 'react'
import { Animated, View } from 'react-native'

import { IconButton } from '../../design-system/Screen'
import { useAppSettings } from '../../state/AppSettingsContext'
import { tokens } from '../../theme/tokens'

import { MiniNowPlaying } from './MiniNowPlaying'
import { SpeakerSelector } from './SpeakerSelector'

type PlayerHeaderProps = {
	mobile: boolean
	speakerName: string
	speakerMenuOpen: boolean
	speakerMenuProgress: Animated.Value
	onMenuToggle: () => void
	controlsExpanded: boolean
	sheetProgress: Animated.Value
	compactHeaderHeight: number
	onHeaderHeight: (height: number) => void
	onCompactHeight: (height: number) => void
	playbackDevice: SoundTouchDevice | null
	onSettings: () => void
}

/** Replaces speaker selection with compact playback as the mobile sheet rises. */
export function PlayerHeader({
	mobile,
	speakerName,
	speakerMenuOpen,
	speakerMenuProgress,
	onMenuToggle,
	controlsExpanded,
	sheetProgress,
	compactHeaderHeight,
	onHeaderHeight,
	onCompactHeight,
	playbackDevice,
	onSettings,
}: PlayerHeaderProps) {
	const { colors } = useAppSettings()

	if (!mobile) {
		return (
			<View
				style={{
					maxWidth: tokens.layout.contentWidth,
					width: '100%',
					alignSelf: 'center',
					paddingHorizontal: tokens.layout.gutter,
					paddingTop: tokens.layout.gutter,
					flexDirection: 'row',
					alignItems: 'center',
					gap: 8,
				}}
			>
				<View style={{ flex: 1 }}>
					<SpeakerSelector name={speakerName} expanded={speakerMenuOpen} progress={speakerMenuProgress} onPress={onMenuToggle} />
				</View>
				<IconButton label="Open settings" icon="settings" onPress={onSettings} />
			</View>
		)
	}

	return (
		<View
			onLayout={({ nativeEvent }) => onHeaderHeight(Math.round(nativeEvent.layout.height))}
			style={{ zIndex: 30, minHeight: compactHeaderHeight, maxWidth: tokens.layout.contentWidth, width: '100%', alignSelf: 'center' }}
		>
			<Animated.View
				pointerEvents="none"
				style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.background, opacity: sheetProgress }}
			/>
			<Animated.View
				pointerEvents={controlsExpanded ? 'none' : 'auto'}
				accessibilityElementsHidden={controlsExpanded}
				importantForAccessibility={controlsExpanded ? 'no-hide-descendants' : 'auto'}
				aria-hidden={controlsExpanded}
				style={{
					padding: tokens.layout.gutter,
					paddingBottom: 0,
					paddingRight: 72,
					opacity: sheetProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
					transform: [{ translateY: sheetProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
				}}
			>
				<SpeakerSelector name={speakerName} expanded={speakerMenuOpen} progress={speakerMenuProgress} onPress={onMenuToggle} />
			</Animated.View>
			<Animated.View
				testID="mini-now-playing"
				onLayout={({ nativeEvent }) => onCompactHeight(Math.round(nativeEvent.layout.height))}
				pointerEvents={controlsExpanded ? 'auto' : 'none'}
				accessibilityElementsHidden={!controlsExpanded}
				importantForAccessibility={controlsExpanded ? 'auto' : 'no-hide-descendants'}
				aria-hidden={!controlsExpanded}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					paddingHorizontal: tokens.layout.gutter,
					paddingVertical: 10,
					opacity: sheetProgress,
					transform: [{ translateY: sheetProgress.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }],
				}}
			>
				<MiniNowPlaying device={playbackDevice} active={controlsExpanded} />
			</Animated.View>
			<Animated.View
				pointerEvents={controlsExpanded ? 'none' : 'box-none'}
				accessibilityElementsHidden={controlsExpanded}
				importantForAccessibility={controlsExpanded ? 'no-hide-descendants' : 'auto'}
				aria-hidden={controlsExpanded}
				style={{
					position: 'absolute',
					top: 0,
					bottom: 0,
					right: tokens.layout.gutter,
					justifyContent: 'center',
					opacity: sheetProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
				}}
			>
				<IconButton label="Open settings" icon="settings" onPress={onSettings} />
			</Animated.View>
		</View>
	)
}
