import { fireEvent, render } from '@testing-library/react-native'

import React from 'react'
import { vi } from 'vitest'

import NativeVolumeSlider from '../src/design-system/VolumeSlider'

vi.mock('../src/state/AppSettingsContext', () => ({ useAppSettings: () => ({ colors: { text: '#111', border: '#ddd' } }) }))

test('native accessibility actions adjust in small steps and respect disabled controls', async () => {
	const callbacks = { onValueChange: vi.fn(), onSlidingComplete: vi.fn(), onCancel: vi.fn() }
	const screen = await render(<NativeVolumeSlider value={25} {...callbacks} />)

	await fireEvent(screen.getByLabelText('Speaker volume'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } })
	expect(callbacks.onSlidingComplete).toHaveBeenCalledWith(30)

	await screen.rerender(<NativeVolumeSlider value={25} disabled {...callbacks} />)
	await fireEvent(screen.getByLabelText('Speaker volume'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } })
	expect(callbacks.onSlidingComplete).toHaveBeenCalledTimes(1)
})

test('native track taps do nothing and thumb drags commit only on release', async () => {
	const callbacks = { onValueChange: vi.fn(), onSlidingComplete: vi.fn(), onCancel: vi.fn() }
	const screen = await render(<NativeVolumeSlider value={25} {...callbacks} />)
	const track = screen.getByLabelText('Speaker volume')

	await fireEvent(track, 'layout', { nativeEvent: { layout: { width: 248 } } })
	await fireEvent.press(track)
	expect(callbacks.onSlidingComplete).not.toHaveBeenCalled()

	const thumb = screen.getByTestId('volume-thumb')
	await fireEvent(thumb, 'responderGrant', { nativeEvent: { pageX: 50 } })
	await fireEvent(thumb, 'responderMove', { nativeEvent: { pageX: 70 } })
	expect(callbacks.onValueChange).toHaveBeenCalledWith(35)
	expect(callbacks.onSlidingComplete).not.toHaveBeenCalled()

	await fireEvent(thumb, 'responderRelease')
	expect(callbacks.onSlidingComplete).toHaveBeenCalledWith(35)
})
