import { fireEvent, render } from '@testing-library/react-native'

import React from 'react'
import { vi } from 'vitest'

import WebVolumeSlider from '../src/design-system/VolumeSlider.web'

import { requiredAt } from './requiredAt'

vi.mock('../src/state/AppSettingsContext', () => ({
	useAppSettings: () => ({ colors: { text: '#111', border: '#ddd' } }),
}))

async function setupWeb() {
	const callbacks = { onValueChange: vi.fn(), onSlidingComplete: vi.fn(), onCancel: vi.fn() }
	const screen = await render(<WebVolumeSlider value={25} {...callbacks} />)
	const input = screen.getByLabelText('Speaker volume')
	const thumb = requiredAt(
		screen.container.queryAll((element) => element.props['data-testid'] === 'volume-thumb'),
		0
	)
	const target = {
		parentElement: { getBoundingClientRect: () => ({ left: 0, width: 248 }), focus: vi.fn() },
		focus: vi.fn(),
		setPointerCapture: vi.fn(),
		releasePointerCapture: vi.fn(),
	}
	const event = (clientX: number) => ({
		clientX,
		isPrimary: true,
		button: 0,
		pointerId: 1,
		currentTarget: target,
		preventDefault: vi.fn(),
	})

	return { callbacks, input, thumb, target, event }
}

test('tapping the far end of the volume track never changes volume', async () => {
	const { callbacks, input, target, event } = await setupWeb()
	const tap = event(220)

	await fireEvent(input, 'pointerDown', tap)
	await fireEvent(input, 'pointerUp', tap)

	expect(tap.preventDefault).not.toHaveBeenCalled()
	expect(target.setPointerCapture).not.toHaveBeenCalled()
	expect(callbacks.onValueChange).not.toHaveBeenCalled()
	expect(callbacks.onSlidingComplete).not.toHaveBeenCalled()
})

test('tapping the thumb without dragging does not send a volume command', async () => {
	const { callbacks, thumb, event } = await setupWeb()

	await fireEvent(thumb, 'pointerDown', event(62))
	await fireEvent(thumb, 'pointerUp', event(62))

	expect(callbacks.onSlidingComplete).not.toHaveBeenCalled()
})

test('thumb dragging previews relative movement and sends one command on release', async () => {
	const { callbacks, thumb, event } = await setupWeb()

	await fireEvent(thumb, 'pointerDown', event(62))
	await fireEvent(thumb, 'pointerMove', event(82))

	expect(callbacks.onValueChange).toHaveBeenLastCalledWith(35)
	expect(callbacks.onSlidingComplete).not.toHaveBeenCalled()

	await fireEvent(thumb, 'pointerUp', event(82))
	await fireEvent(thumb, 'lostPointerCapture')

	expect(callbacks.onSlidingComplete).toHaveBeenCalledTimes(1)
	expect(callbacks.onSlidingComplete).toHaveBeenCalledWith(35)
})

test('an interrupted drag discards the preview without sending a command', async () => {
	const { callbacks, thumb, event } = await setupWeb()

	await fireEvent(thumb, 'pointerDown', event(62))
	await fireEvent(thumb, 'pointerMove', event(82))
	await fireEvent(thumb, 'pointerCancel')
	await fireEvent(thumb, 'pointerUp', event(82))

	expect(callbacks.onCancel).toHaveBeenCalled()
	expect(callbacks.onSlidingComplete).not.toHaveBeenCalled()
})

test('keyboard adjustments use small steps and cannot jump to maximum', async () => {
	const { callbacks, input } = await setupWeb()
	const preventDefault = vi.fn()

	await fireEvent(input, 'keyDown', { key: 'End', preventDefault })
	expect(callbacks.onSlidingComplete).not.toHaveBeenCalled()

	await fireEvent(input, 'keyDown', { key: 'ArrowRight', preventDefault })
	expect(callbacks.onSlidingComplete).toHaveBeenCalledWith(30)

	await fireEvent(input, 'keyDown', { key: 'ArrowRight', repeat: true, preventDefault })
	expect(callbacks.onSlidingComplete).toHaveBeenCalledTimes(1)
})
