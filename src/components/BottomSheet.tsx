import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, type GestureResponderEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { useAppSettings } from '../state/AppSettingsContext'

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
}

const DRAG_OPEN_PROGRESS_THRESHOLD = 0.5
const DRAG_FLICK_VELOCITY_THRESHOLD = 0.35
const SPRING_TENSION = 300
const SPRING_FRICTION = 24
const MAX_SPRING_VELOCITY = 3.5

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

export function BottomSheet({ footerHeight, screenHeight, renderTopContent, children, onExpandedChange }: BottomSheetProps) {
	const { colors } = useAppSettings()
	const [isExpanded, setIsExpanded] = useState(false)
	const [isVisible, setIsVisible] = useState(false)
	const [overlayHeight, setOverlayHeight] = useState(0)

	const availableHeight = Math.max(1, overlayHeight || screenHeight)
	const closedOffset = Math.max(0, availableHeight - footerHeight)
	const dragDistance = Math.max(1, closedOffset)

	const [progress] = useState(() => new Animated.Value(0))
	const progressValueRef = useRef(0)
	const dragStartProgressRef = useRef(0)
	const dragStartYRef = useRef(0)
	const dragStartXRef = useRef(0)
	const dragLastYRef = useRef(0)
	const dragLastTsRef = useRef(0)
	const dragVelocityYRef = useRef(0)

	const getProgressForPageY = useCallback(
		(pageY: number) => clamp01(dragStartProgressRef.current - (pageY - dragStartYRef.current) / dragDistance),
		[dragDistance]
	)

	useEffect(() => {
		const id = progress.addListener(({ value }) => {
			progressValueRef.current = value
		})
		return () => {
			progress.removeListener(id)
		}
	}, [progress])

	useEffect(() => {
		onExpandedChange?.(isExpanded)
	}, [isExpanded, onExpandedChange])

	const animateProgressTo = useCallback(
		(toValue: 0 | 1, velocity = 0, onFinished?: () => void) => {
			progress.stopAnimation()
			Animated.spring(progress, {
				toValue,
				velocity: Math.max(-MAX_SPRING_VELOCITY, Math.min(MAX_SPRING_VELOCITY, velocity)),
				tension: SPRING_TENSION,
				friction: SPRING_FRICTION,
				overshootClamping: true,
				useNativeDriver: true,
			}).start(({ finished }) => {
				if (finished) onFinished?.()
			})
		},
		[progress]
	)

	const open = useCallback(
		(velocity = 0) => {
			setIsExpanded(true)
			setIsVisible(true)
			animateProgressTo(1, velocity)
		},
		[animateProgressTo]
	)

	const close = useCallback(
		(velocity = 0) => {
			setIsExpanded(false)
			animateProgressTo(0, velocity, () => {
				setIsVisible(false)
			})
		},
		[animateProgressTo]
	)

	const toggle = useCallback(() => {
		if (isExpanded) {
			close(0)
			return
		}
		open(0)
	}, [isExpanded, open, close])

	const translateY = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [closedOffset, 0],
	})

	const handleStartShouldSetResponderCapture = useCallback((event: GestureResponderEvent) => {
		dragStartXRef.current = event.nativeEvent.pageX
		dragStartYRef.current = event.nativeEvent.pageY
		return false
	}, [])

	const handleMoveShouldSetResponder = useCallback((event: GestureResponderEvent) => {
		const dx = Math.abs(event.nativeEvent.pageX - dragStartXRef.current)
		const dy = Math.abs(event.nativeEvent.pageY - dragStartYRef.current)
		return dy > 6 && dy > dx
	}, [])

	const handleResponderGrant = useCallback(
		(event: GestureResponderEvent) => {
			if (!isVisible) {
				setIsVisible(true)
			}
			const pageY = event.nativeEvent.pageY
			dragStartYRef.current = pageY
			dragLastYRef.current = pageY
			dragLastTsRef.current = Date.now()
			dragVelocityYRef.current = 0
			progress.stopAnimation()
			dragStartProgressRef.current = progressValueRef.current
		},
		[isVisible, progress]
	)

	const handleResponderMove = useCallback(
		(event: GestureResponderEvent) => {
			const pageY = event.nativeEvent.pageY
			const now = typeof event.nativeEvent.timestamp === 'number' ? event.nativeEvent.timestamp : Date.now()
			const dtMs = Math.max(1, now - dragLastTsRef.current)
			dragVelocityYRef.current = (pageY - dragLastYRef.current) / dtMs
			dragLastYRef.current = pageY
			dragLastTsRef.current = now

			const nextProgress = getProgressForPageY(pageY)
			progress.setValue(nextProgress)
		},
		[getProgressForPageY, progress]
	)

	const settleByGesture = useCallback(
		(pageY: number) => {
			const currentProgress = getProgressForPageY(pageY)
			progress.setValue(currentProgress)
			const vy = dragVelocityYRef.current

			if (vy <= -DRAG_FLICK_VELOCITY_THRESHOLD) {
				open(Math.abs(vy) * 2.5)
				return
			}
			if (vy >= DRAG_FLICK_VELOCITY_THRESHOLD) {
				close(Math.abs(vy) * 2.5)
				return
			}
			if (currentProgress > DRAG_OPEN_PROGRESS_THRESHOLD) {
				open(0.5)
				return
			}
			close(0.5)
		},
		[getProgressForPageY, progress, open, close]
	)

	const handleResponderRelease = useCallback(
		(event: GestureResponderEvent) => {
			settleByGesture(event.nativeEvent.pageY)
		},
		[settleByGesture]
	)

	const handleResponderTerminate = useCallback(() => {
		close(0.5)
	}, [close])

	const dragResponderProps = {
		onStartShouldSetResponderCapture: handleStartShouldSetResponderCapture,
		onMoveShouldSetResponder: handleMoveShouldSetResponder,
		onResponderGrant: handleResponderGrant,
		onResponderMove: handleResponderMove,
		onResponderRelease: handleResponderRelease,
		onResponderTerminate: handleResponderTerminate,
	} as const

	return (
		<View pointerEvents="box-none" style={styles.root} onLayout={(event) => setOverlayHeight(event.nativeEvent.layout.height)}>
			{isVisible && <Pressable style={styles.backdrop} onPress={() => close(0)} accessibilityRole="button" accessibilityLabel="Close speaker settings" />}

			<Animated.View pointerEvents="box-none" style={styles.overlay}>
				<Animated.View style={[styles.panel, { backgroundColor: colors.surfaceElevated, transform: [{ translateY }] }]}>
					{isVisible && (
						<Animated.View
							style={[
								styles.panelHandleWrap,
								{
									opacity: progress.interpolate({
										inputRange: [0.05, 0.25, 1],
										outputRange: [0, 0.5, 1],
										extrapolate: 'clamp',
									}),
									transform: [
										{
											translateY: progress.interpolate({
												inputRange: [0, 1],
												outputRange: [6, 0],
												extrapolate: 'clamp',
											}),
										},
									],
								},
							]}
							{...dragResponderProps}
						>
							<View style={styles.panelHandle} />
						</Animated.View>
					)}

					<View style={styles.summaryWrap} {...dragResponderProps}>
						{renderTopContent({ isExpanded, toggle })}
					</View>

					{isVisible && (
						<>
							<ScrollView
								contentContainerStyle={[styles.content, { paddingTop: 0, paddingBottom: footerHeight + 24 }]}
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

const styles = StyleSheet.create({
	root: {
		...StyleSheet.absoluteFillObject,
		zIndex: 20,
		justifyContent: 'flex-end',
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		zIndex: 10,
	},
	overlay: {
		...StyleSheet.absoluteFillObject,
		zIndex: 20,
	},
	panel: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: '#fff',
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
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
