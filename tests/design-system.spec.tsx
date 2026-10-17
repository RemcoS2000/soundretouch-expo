import { fireEvent, render } from '@testing-library/react-native'

import React from 'react'
import { vi } from 'vitest'

import { Button, Notice } from '../src/design-system/Screen'
import { AppSettingsProvider } from '../src/state/AppSettingsContext'

test('buttons expose selected and disabled states and invoke enabled actions', async () => {
	const onPress = vi.fn()
	const screen = await render(
		<AppSettingsProvider>
			<Button label="Choose source" selected disabled onPress={onPress} />
			<Button label="Retry" onPress={onPress} />
		</AppSettingsProvider>
	)
	await fireEvent.press(screen.getByRole('button', { name: 'Choose source' }))
	expect(onPress).not.toHaveBeenCalled()
	await fireEvent.press(screen.getByRole('button', { name: 'Retry' }))
	expect(onPress).toHaveBeenCalledTimes(1)
	expect(screen.getByRole('button', { name: 'Choose source' }).props.accessibilityState).toEqual({ disabled: true, selected: true })
})
test('errors provide an actionable retry button', async () => {
	const retry = vi.fn()
	const screen = await render(
		<AppSettingsProvider>
			<Notice message="Speaker unavailable" retry={retry} />
		</AppSettingsProvider>
	)
	expect(screen.getByText('Speaker unavailable')).toBeTruthy()
	await fireEvent.press(screen.getByRole('button', { name: 'Retry' }))
	expect(retry).toHaveBeenCalledTimes(1)
})
