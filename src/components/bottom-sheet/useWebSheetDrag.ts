import { useEffect } from 'react'
import { type GestureResponderEvent, Platform } from 'react-native'

import type { SheetDragHandlers } from './useSheetDrag'

type PointerState = {
	start: { x: number; y: number; pointer: number } | null
	dragging: boolean
	suppressClick: boolean
	clickReset: ReturnType<typeof setTimeout> | undefined
}

/** Adapts browser coordinates to the native responder callbacks shared by both platforms. */
const responderEvent = (event: PointerEvent) => ({ nativeEvent: { pageX: event.pageX, pageY: event.pageY } }) as GestureResponderEvent

/** Ends click suppression after a completed gesture without leaving a timer behind. */
function releaseSuppression(state: PointerState, setIgnored: (ignored: boolean) => void) {
	state.clickReset = setTimeout(() => {
		state.suppressClick = false
		setIgnored(false)
	}, 250)
}

/** Retains pointer capture and suppresses the compatibility click after a vertical drag. */
function pointerHandlers(header: HTMLElement, drag: SheetDragHandlers, setIgnored: (ignored: boolean) => void) {
	const state: PointerState = { start: null, dragging: false, suppressClick: false, clickReset: undefined }

	return {
		down: (event: PointerEvent) => {
			if (event.isPrimary && event.button === 0) {
				state.start = { x: event.pageX, y: event.pageY, pointer: event.pointerId }
			}
		},
		move: (event: PointerEvent) => {
			if (!state.start || state.start.pointer !== event.pointerId) {
				return
			}
			const distance = Math.abs(event.pageY - state.start.y)

			if (!state.dragging && distance > 6 && distance > Math.abs(event.pageX - state.start.x)) {
				state.dragging = true
				state.suppressClick = true
				setIgnored(true)
				header.setPointerCapture(event.pointerId)
				drag.onResponderGrant(responderEvent(event))
			}
			if (state.dragging) {
				event.preventDefault()
				drag.onResponderMove(responderEvent(event))
			}
		},
		up: (event: PointerEvent) => {
			if (!state.start || state.start.pointer !== event.pointerId) {
				return
			}
			if (state.dragging) {
				drag.onResponderRelease(responderEvent(event))
				header.releasePointerCapture(event.pointerId)
				releaseSuppression(state, setIgnored)
			}
			state.start = null
			state.dragging = false
		},
		cancel: () => {
			if (state.dragging) {
				drag.onResponderTerminate()
			}
			state.start = null
			state.dragging = false
			state.suppressClick = false
			setIgnored(false)
		},
		click: (event: MouseEvent) => {
			if (state.suppressClick) {
				event.preventDefault()
				event.stopPropagation()
			}
		},
		cleanup: () => {
			clearTimeout(state.clickReset)
			setIgnored(false)
		},
	}
}

/** Rebinds pointer handlers when expansion changes the header's browser element. */
export function useWebSheetDrag(panelId: string, expanded: boolean, drag: SheetDragHandlers, setIgnored: (ignored: boolean) => void) {
	useEffect(() => {
		if (Platform.OS !== 'web') {
			return
		}
		const header = document.getElementById(`${panelId}-summary`)

		if (!header) {
			return
		}
		const previous = header.style.touchAction
		const handlers = pointerHandlers(header, drag, setIgnored)

		header.style.touchAction = 'none'
		header.addEventListener('pointerdown', handlers.down)
		header.addEventListener('click', handlers.click, true)
		window.addEventListener('pointermove', handlers.move, { passive: false })
		window.addEventListener('pointerup', handlers.up)
		window.addEventListener('pointercancel', handlers.cancel)
		window.addEventListener('blur', handlers.cancel)

		return () => {
			handlers.cleanup()
			header.style.touchAction = previous
			header.removeEventListener('pointerdown', handlers.down)
			header.removeEventListener('click', handlers.click, true)
			window.removeEventListener('pointermove', handlers.move)
			window.removeEventListener('pointerup', handlers.up)
			window.removeEventListener('pointercancel', handlers.cancel)
			window.removeEventListener('blur', handlers.cancel)
		}
	}, [panelId, expanded, drag, setIgnored])
}
