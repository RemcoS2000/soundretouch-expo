import { type RefObject, useMemo, useRef } from 'react'
import type { Animated, GestureResponderEvent } from 'react-native'

type DragState = { x: number; y: number; lastY: number; lastTime: number; velocity: number; progress: number }
type DragOptions = {
	progress: Animated.Value
	progressValueRef: RefObject<number>
	distance: number
	open: (velocity?: number) => void
	close: (velocity?: number) => void
	setVisible: (visible: boolean) => void
}

/** Converts vertical movement into progress relative to the original animation position. */
function dragProgress(pageY: number, state: DragState, distance: number) {
	return Math.max(0, Math.min(1, state.progress - (pageY - state.y) / distance))
}

/** Measures velocity from the previous sample before advancing the shared animation. */
function moveDrag(pageY: number, state: DragState, { progress, distance }: DragOptions) {
	const now = Date.now()
	const elapsed = Math.max(1, now - state.lastTime)

	state.velocity = (pageY - state.lastY) / elapsed
	state.lastY = pageY
	state.lastTime = now
	progress.setValue(dragProgress(pageY, state, distance))
}

/** Snaps deliberate swipes first, then uses progress for shorter, slower gestures. */
function settleDrag(pageY: number, state: DragState, { progress, distance, open, close }: DragOptions) {
	const current = dragProgress(pageY, state, distance)
	const movement = pageY - state.y
	const velocity = state.velocity

	progress.setValue(current)
	if (movement < -48 || velocity <= -0.35) {
		open(Math.abs(velocity) * 2.5)

		return
	}
	if (movement > 48 || velocity >= 0.35) {
		close(Math.abs(velocity) * 2.5)

		return
	}
	if (current > 0.5) {
		open(0.5)

		return
	}
	close(0.5)
}

/** Shares native responder callbacks with the browser pointer adapter. */
export function useSheetDrag(options: DragOptions) {
	const { progress, progressValueRef, distance, open, close, setVisible } = options
	const state = useRef<DragState>({ x: 0, y: 0, lastY: 0, lastTime: 0, velocity: 0, progress: 0 })

	return useMemo(
		() => ({
			onStartShouldSetResponderCapture(event: GestureResponderEvent) {
				state.current.x = event.nativeEvent.pageX
				state.current.y = event.nativeEvent.pageY

				return false
			},
			onMoveShouldSetResponderCapture(event: GestureResponderEvent) {
				const dx = Math.abs(event.nativeEvent.pageX - state.current.x)
				const dy = Math.abs(event.nativeEvent.pageY - state.current.y)

				return dy > 6 && dy > dx
			},
			onResponderGrant(event: GestureResponderEvent) {
				setVisible(true)
				const pageY = event.nativeEvent.pageY

				state.current.y = pageY
				state.current.lastY = pageY
				state.current.lastTime = Date.now()
				state.current.velocity = 0
				progress.stopAnimation()
				state.current.progress = progressValueRef.current
			},
			onResponderMove: (event: GestureResponderEvent) =>
				moveDrag(event.nativeEvent.pageY, state.current, { progress, progressValueRef, distance, open, close, setVisible }),
			onResponderRelease: (event: GestureResponderEvent) =>
				settleDrag(event.nativeEvent.pageY, state.current, { progress, progressValueRef, distance, open, close, setVisible }),
			onResponderTerminate: () => close(0.5),
		}),
		[progress, progressValueRef, distance, open, close, setVisible]
	)
}

export type SheetDragHandlers = ReturnType<typeof useSheetDrag>
