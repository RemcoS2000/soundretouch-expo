import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Animated, ScrollView, Text, useWindowDimensions, View } from 'react-native'

import { errorMessage, Notice } from '../../design-system/Screen'
import { useAppSettings } from '../../state/AppSettingsContext'
import { type SoundTouchDeviceEntry } from '../../state/SoundTouchDevicesContext'
import { tokens } from '../../theme/tokens'
import { reportAsync } from '../../utils/async'
import { speakerId } from '../speakers/identity'

import { Playback } from './Playback'
import { PlayerHeader } from './PlayerHeader'
import { SpeakerControlSheet } from './SpeakerControlSheet'
import { SpeakerDropdown } from './SpeakerDropdown'
import { usePlayerSpeaker } from './usePlayerSpeaker'
import { useSpeakerMenu } from './useSpeakerMenu'

/**
 * Composes the selected speaker player. Group playback uses the master; volume stays local.
 * On mobile, the sheet and compact header share animation progress throughout each drag.
 */
export function PlayerContent({ entry, openSpeakerMenu = false }: { entry: SoundTouchDeviceEntry; openSpeakerMenu?: boolean }) {
	const router = useRouter()
	const { width } = useWindowDimensions()
	const [controlsExpanded, setControlsExpanded] = useState(false)
	const [sheetHeight, setSheetHeight] = useState(80)
	const [headerHeight, setHeaderHeight] = useState(tokens.layout.headerHeight)
	const [compactHeaderHeight, setCompactHeaderHeight] = useState(tokens.layout.headerHeight)
	const [sheetProgress] = useState(() => new Animated.Value(0))
	const { open: speakerMenuOpen, setOpen: setSpeakerMenuOpen, progress: speakerMenuProgress, close: closeSpeakerMenu } = useSpeakerMenu(openSpeakerMenu)

	const { info, zone, connection, master, controller, slave, speakerName } = usePlayerSpeaker(entry)
	const mobile = width < tokens.layout.wideBreakpoint

	return (
		<View style={{ flex: 1 }}>
			<PlayerHeader
				mobile={mobile}
				speakerName={speakerName}
				speakerMenuOpen={speakerMenuOpen}
				speakerMenuProgress={speakerMenuProgress}
				onMenuToggle={() => setSpeakerMenuOpen((open) => !open)}
				controlsExpanded={controlsExpanded}
				sheetProgress={sheetProgress}
				compactHeaderHeight={compactHeaderHeight}
				onHeaderHeight={setHeaderHeight}
				onCompactHeight={setCompactHeaderHeight}
				playbackDevice={slave && !master ? null : controller.device}
				onSettings={() => router.push('/settings')}
			/>
			<ScrollView
				accessibilityElementsHidden={controlsExpanded}
				importantForAccessibility={controlsExpanded ? 'no-hide-descendants' : 'auto'}
				aria-hidden={controlsExpanded}
				contentContainerStyle={{
					padding: tokens.layout.gutter,
					paddingTop: 0,
					maxWidth: tokens.layout.contentWidth,
					width: '100%',
					alignSelf: 'center',
					paddingBottom: sheetHeight + 24,
				}}
			>
				<Animated.View
					style={
						mobile
							? {
									opacity: sheetProgress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0, 0] }),
									transform: [{ translateY: sheetProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }],
								}
							: undefined
					}
				>
					<GroupPlayback entry={controller} master={master} slave={slave} connected={connection.data === 'open'} />
					<Notice
						message={errorMessage(info.error ?? zone.error)}
						retry={() => {
							reportAsync(info.refetch())
							reportAsync(zone.refetch())
						}}
					/>
				</Animated.View>
			</ScrollView>
			<SpeakerDropdown
				open={speakerMenuOpen}
				progress={speakerMenuProgress}
				top={mobile ? headerHeight : tokens.layout.headerHeight}
				onClose={closeSpeakerMenu}
				onAdd={() => {
					closeSpeakerMenu()
					router.push('/device-manager')
				}}
			/>
			<SpeakerControlSheet
				entry={entry}
				controller={controller}
				onExpandedChange={(expanded) => {
					setControlsExpanded(expanded)

					if (expanded) {
						setSpeakerMenuOpen(false)
					}
				}}
				onCollapsedHeightChange={setSheetHeight}
				topInset={mobile ? headerHeight : undefined}
				animationProgress={sheetProgress}
				modal={!mobile}
			/>
		</View>
	)
}

/**
 * Keeps group-master availability and playback feedback independent of header animation state.
 */
function GroupPlayback({
	entry,
	master,
	slave,
	connected,
}: {
	entry: SoundTouchDeviceEntry
	master: SoundTouchDeviceEntry | undefined
	slave: boolean
	connected: boolean
}) {
	const { colors } = useAppSettings()

	return (
		<>
			{!connected && <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>Connecting to speaker…</Text>}
			{slave && (
				<Notice message={`Grouped with ${master?.info?.name ?? 'another speaker'}. Playback uses the group master; volume controls this speaker.`} />
			)}
			{slave && !master ? (
				<Notice message="Add the group master to control playback, or leave the group." />
			) : (
				<Playback key={speakerId(entry.device.host, entry.info)} device={entry.device} />
			)}
		</>
	)
}
