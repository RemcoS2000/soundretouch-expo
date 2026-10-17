import { act, renderHook } from '@testing-library/react-native'

import { Animated, type GestureResponderEvent } from 'react-native'
import { vi } from 'vitest'

import { useSheetDrag } from '../src/components/bottom-sheet/useSheetDrag'
import { useWebSheetDrag } from '../src/components/bottom-sheet/useWebSheetDrag'

import { mockWebPlatform } from './platform'

/** Supplies only the native coordinates used by the shared gesture recognizer. */
function touch(x: number, y: number): GestureResponderEvent {
	return { nativeEvent: { pageX: x, pageY: y } } as GestureResponderEvent
}

afterEach(() => {
	vi.restoreAllMocks()
	vi.useRealTimers()
})

test.each([
	[0, 400, 280, 'open'],
	[1, 280, 400, 'close'],
	[0.7, 400, 390, 'open'],
	[0.2, 400, 410, 'close'],
] as const)('sheet drag snaps from progress %s toward %s/%s with %s', async (initial, start, end, expected) => {
	const progress = new Animated.Value(initial)
	const open = vi.fn()
	const close = vi.fn()
	const visible = vi.fn()
	let time = 0
	vi.spyOn(Date, 'now').mockImplementation(() => time)
	const { result, unmount } = await renderHook(() =>
		useSheetDrag({ progress, progressValueRef: { current: initial }, distance: 400, open, close, setVisible: visible })
	)
	expect(result.current.onStartShouldSetResponderCapture(touch(0, start))).toBe(false)
	expect(result.current.onMoveShouldSetResponderCapture(touch(30, start + 10))).toBe(false)
	expect(result.current.onMoveShouldSetResponderCapture(touch(0, start + 20))).toBe(true)
	await act(() => result.current.onResponderGrant(touch(0, start)))
	time = 1000
	await act(() => result.current.onResponderMove(touch(0, end)))
	await act(() => result.current.onResponderRelease(touch(0, end)))
	expect(visible).toHaveBeenCalledWith(true)
	expect(expected === 'open' ? open : close).toHaveBeenCalled()
	await act(() => result.current.onResponderTerminate())
	expect(close).toHaveBeenLastCalledWith(0.5)
	await unmount()
})

/** Emits browser events through real EventTarget dispatch rather than calling private adapter functions. */
function pointer(type: string, x = 0, y = 0, id = 1) {
	return Object.assign(new Event(type, { cancelable: true }), { pageX: x, pageY: y, pointerId: id, isPrimary: true, button: 0 })
}

test('web drag captures vertical gestures, suppresses compatibility clicks and releases listeners', async () => {
	vi.useFakeTimers()
	mockWebPlatform()
	const header = Object.assign(new EventTarget(), { style: { touchAction: 'auto' }, setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() })
	const windowEvents = new EventTarget()
	const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
	const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
	Object.defineProperty(globalThis, 'document', { configurable: true, value: { getElementById: () => header } })
	Object.defineProperty(globalThis, 'window', { configurable: true, value: windowEvents })
	const drag = {
		onStartShouldSetResponderCapture: vi.fn(),
		onMoveShouldSetResponderCapture: vi.fn(),
		onResponderGrant: vi.fn(),
		onResponderMove: vi.fn(),
		onResponderRelease: vi.fn(),
		onResponderTerminate: vi.fn(),
	}
	const ignored = vi.fn()

	try {
		const { unmount } = await renderHook(() => useWebSheetDrag('sheet', false, drag, ignored))
		expect(header.style.touchAction).toBe('none')
		windowEvents.dispatchEvent(pointer('pointermove', 0, 30))
		expect(drag.onResponderMove).not.toHaveBeenCalled()
		header.dispatchEvent(pointer('pointerdown', 0, 100))
		windowEvents.dispatchEvent(pointer('pointermove', 30, 101))
		expect(drag.onResponderGrant).not.toHaveBeenCalled()
		windowEvents.dispatchEvent(pointer('pointermove', 0, 80, 2))
		windowEvents.dispatchEvent(pointer('pointermove', 0, 80))
		expect(header.setPointerCapture).toHaveBeenCalledWith(1)
		expect(drag.onResponderGrant).toHaveBeenCalledTimes(1)
		expect(drag.onResponderMove).toHaveBeenCalled()
		windowEvents.dispatchEvent(pointer('pointerup', 0, 60, 2))
		windowEvents.dispatchEvent(pointer('pointerup', 0, 60))
		expect(drag.onResponderRelease).toHaveBeenCalledTimes(1)
		expect(header.dispatchEvent(new Event('click', { cancelable: true }))).toBe(false)
		await act(() => vi.advanceTimersByTime(250))
		expect(header.dispatchEvent(new Event('click', { cancelable: true }))).toBe(true)
		header.dispatchEvent(pointer('pointerdown', 0, 100))
		windowEvents.dispatchEvent(pointer('pointermove', 0, 80))
		windowEvents.dispatchEvent(new Event('pointercancel'))
		expect(drag.onResponderTerminate).toHaveBeenCalled()
		await unmount()
		expect(header.style.touchAction).toBe('auto')
		expect(ignored).toHaveBeenLastCalledWith(false)
		const calls = drag.onResponderMove.mock.calls.length
		windowEvents.dispatchEvent(pointer('pointermove', 0, 30))
		expect(drag.onResponderMove).toHaveBeenCalledTimes(calls)
	} finally {
		if (oldDocument) {
			Object.defineProperty(globalThis, 'document', oldDocument)
		} else {
			Reflect.deleteProperty(globalThis, 'document')
		}
		if (oldWindow) {
			Object.defineProperty(globalThis, 'window', oldWindow)
		} else {
			Reflect.deleteProperty(globalThis, 'window')
		}
	}
})
