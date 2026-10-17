import React, { useId, useState } from 'react'
import { Animated, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { useAppSettings } from '../state/AppSettingsContext'

import { useSheetAnimation } from './bottom-sheet/useSheetAnimation'
import { useSheetDismissal } from './bottom-sheet/useSheetDismissal'
import { useSheetDrag } from './bottom-sheet/useSheetDrag'
import { useWebSheetDrag } from './bottom-sheet/useWebSheetDrag'

type BottomSheetProps = {
	/** Visible height (px) of the collapsed state (the summary/footer row). */
	footerHeight: number
	/** Full available container height, usually window/screen height in px. */
	screenHeight: number
	/** Renders the fixed top content row and receives expansion state + toggle action. */
	renderTopContent: (args: { isExpanded: boolean; toggle: () => void }) => React.ReactNode
	/** Main expanded content shown inside the sheet scroll area. */
	children: React.ReactNode
	/** Optional expansion state listener for parent UI coordination. */
	onExpandedChange?: (isExpanded: boolean) => void
	/** Reports the measured collapsed height so the player reserves enough scroll space. */
	onCollapsedHeightChange?: (height: number) => void
	/** Reserves the mobile header and compact player above the expanded sheet. */
	topInset?: number | undefined
	/** Protects controls from the home indicator when the player has no bottom navigation. */
	bottomInset?: number
	/** Shares the actual drag/animation progress with the mobile header transition. */
	animationProgress?: Animated.Value | undefined
	/** Persistent mobile sheets leave the speaker-selection header accessible. */
	modal?: boolean | undefined
}

/**
 * Presents a persistent, draggable speaker-control sheet with bottom safe-area spacing.
 * Only expanded content mounts; back, Escape and backdrop actions collapse it.
 */
export function BottomSheet({
	footerHeight,
	screenHeight,
	renderTopContent,
	children,
	onExpandedChange,
	onCollapsedHeightChange,
	topInset = 0,
	bottomInset = 0,
	animationProgress,
	modal = true,
}: BottomSheetProps) {
	const { colors } = useAppSettings()
	const panelId = useId()
	const [overlayHeight, setOverlayHeight] = useState(0)
	const [summaryHeight, setSummaryHeight] = useState(footerHeight)
	const { progress, progressValueRef, isExpanded, isVisible, open, close, toggle, setIsVisible, setIgnoreToggleAfterDrag } = useSheetAnimation({
		animationProgress,
		onExpandedChange,
	})
	const { availableHeight, closedOffset } = sheetGeometry({ footerHeight, summaryHeight, overlayHeight, screenHeight, topInset })
	const dragResponderProps = useSheetDrag({ progress, progressValueRef, distance: Math.max(1, closedOffset), open, close, setVisible: setIsVisible })

	useSheetDismissal(panelId, isExpanded, modal, close)
	useWebSheetDrag(panelId, isExpanded, dragResponderProps, setIgnoreToggleAfterDrag)
	const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [closedOffset, 0] })

	return (
		<View pointerEvents="box-none" style={styles.root} onLayout={(event) => setOverlayHeight(Math.round(event.nativeEvent.layout.height))}>
			{isVisible && (
				<Pressable
					style={[styles.backdrop, { top: topInset }]}
					onPress={() => close(0)}
					accessibilityRole="button"
					accessibilityLabel="Close speaker settings"
				/>
			)}

			<Animated.View pointerEvents="box-none" style={styles.overlay}>
				<Animated.View
					nativeID={panelId}
					{...panelAccessibility(isExpanded, modal)}
					style={[
						styles.panel,
						{ height: availableHeight, backgroundColor: colors.surfaceElevated, borderColor: colors.border, transform: [{ translateY }] },
					]}
				>
					<View
						nativeID={`${panelId}-summary`}
						style={styles.summaryWrap}
						{...(Platform.OS === 'web' ? {} : dragResponderProps)}
						onLayout={({ nativeEvent }) => {
							// Ignore fractional measurement jitter while the translated sheet is animating.
							const height = Math.max(footerHeight, Math.round(nativeEvent.layout.height))

							setSummaryHeight(height)
							onCollapsedHeightChange?.(height)
						}}
					>
						<View pointerEvents="none" style={styles.panelHandleWrap}>
							<View style={[styles.panelHandle, { backgroundColor: colors.textMuted }]} />
						</View>
						{renderTopContent({ isExpanded, toggle })}
					</View>

					{isExpanded && (
						<>
							<ScrollView
								style={{ flex: 1 }}
								contentContainerStyle={[styles.content, { paddingBottom: 24 + bottomInset }]}
								keyboardShouldPersistTaps="handled"
								showsVerticalScrollIndicator={false}
								bounces={false}
								overScrollMode="never"
							>
								{children}
							</ScrollView>
						</>
					)}
				</Animated.View>
			</Animated.View>
		</View>
	)
}

/** Gives only the expanded panel a landmark and modal accessibility state. */
function panelAccessibility(expanded: boolean, modal: boolean) {
	const modalState = expanded && modal

	if (!expanded) {
		return { accessibilityViewIsModal: false, 'aria-modal': false }
	}

	return {
		accessibilityViewIsModal: modalState,
		'aria-modal': modalState,
		role: modal ? ('dialog' as const) : ('region' as const),
		accessibilityLabel: 'Speaker controls',
	}
}

/** Computes snap positions without coupling gesture state to layout measurements. */
function sheetGeometry({
	footerHeight,
	summaryHeight,
	overlayHeight,
	screenHeight,
	topInset,
}: {
	footerHeight: number
	summaryHeight: number
	overlayHeight: number
	screenHeight: number
	topInset: number
}) {
	const collapsedHeight = Math.max(footerHeight, summaryHeight)
	const containerHeight = overlayHeight || screenHeight
	const expandedHeight = topInset ? Math.max(0, containerHeight - topInset) : Math.min(720, containerHeight * 0.88)
	const availableHeight = Math.max(collapsedHeight, expandedHeight)

	return { availableHeight, closedOffset: Math.max(0, availableHeight - collapsedHeight) }
}

const styles = StyleSheet.create({
	root: {
		...StyleSheet.absoluteFill,
		zIndex: 20,
		justifyContent: 'flex-end',
	},
	backdrop: {
		...StyleSheet.absoluteFill,
		zIndex: 10,
		backgroundColor: 'rgba(0,0,0,0.28)',
	},
	overlay: {
		...StyleSheet.absoluteFill,
		zIndex: 20,
	},
	panel: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		maxWidth: 640,
		width: '100%',
		marginHorizontal: 'auto',
		borderWidth: 1,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		overflow: 'hidden',
	},
	panelHandleWrap: {
		position: 'absolute',
		top: 8,
		left: 0,
		right: 0,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 3,
		minHeight: 12,
	},
	panelHandle: {
		width: 44,
		height: 5,
		borderRadius: 999,
		backgroundColor: '#d1d5db',
	},
	summaryWrap: {
		zIndex: 2,
	},
	content: {
		paddingHorizontal: 20,
		gap: 12,
	},
})
