import { act, fireEvent, render } from '@testing-library/react-native'

import React from 'react'
import { Animated, BackHandler, Pressable, Text } from 'react-native'
import { vi } from 'vitest'

import { BottomSheet } from '../src/components/BottomSheet'

const { mockNavigation } = vi.hoisted(() => ({ mockNavigation: { addListener: vi.fn(() => vi.fn()) } }))

vi.mock('expo-router', () => ({ useNavigation: () => mockNavigation }))
vi.mock('../src/state/AppSettingsContext', () => ({
	useAppSettings: () => ({ reducedMotion: true, colors: { surfaceElevated: '#fff', textMuted: '#666', border: '#ddd' } }),
}))

async function renderSheet(options: { animationProgress?: Animated.Value; topInset?: number; modal?: boolean } = {}) {
	const onExpandedChange = vi.fn()
	const screen = await render(
		<BottomSheet
			footerHeight={80}
			{...options}
			screenHeight={700}
			onExpandedChange={onExpandedChange}
			renderTopContent={({ isExpanded, toggle }) => (
				<Pressable accessibilityRole="button" onPress={toggle}>
					<Text>{isExpanded ? 'Collapse controls' : 'Expand controls'}</Text>
				</Pressable>
			)}
		>
			<Text>Panel content</Text>
		</BottomSheet>
	)

	return { screen, onExpandedChange }
}

test('collapsed panels stay unmounted and backdrop dismissal releases their content', async () => {
	const { screen, onExpandedChange } = await renderSheet()
	expect(screen.queryByText('Panel content')).toBeNull()

	await fireEvent.press(screen.getByText('Expand controls'))
	expect(screen.getByText('Panel content')).toBeTruthy()
	expect(onExpandedChange).toHaveBeenLastCalledWith(true)

	await fireEvent.press(screen.getByLabelText('Close speaker settings'))
	expect(screen.queryByText('Panel content')).toBeNull()
	expect(onExpandedChange).toHaveBeenLastCalledWith(false)
})

test('Android Back collapses an expanded sheet instead of leaving the player', async () => {
	const back = vi.spyOn(BackHandler, 'addEventListener')
	const { screen } = await renderSheet()
	await fireEvent.press(screen.getByText('Expand controls'))

	const handler = back.mock.calls.find(([event]) => event === 'hardwareBackPress')?.[1]
	await act(() => {
		expect(handler?.({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true)
	})
	expect(screen.queryByText('Panel content')).toBeNull()
	back.mockRestore()
})

test('the mobile header receives the same opening and closing progress as the sheet', async () => {
	const progress = new Animated.Value(0)
	const changes = vi.fn()
	const listener = progress.addListener(({ value }) => changes(value))
	const { screen } = await renderSheet({ animationProgress: progress, topInset: 160, modal: false })

	await fireEvent.press(screen.getByText('Expand controls'))
	expect(changes).toHaveBeenLastCalledWith(1)

	await fireEvent.press(screen.getByText('Collapse controls'))
	expect(changes).toHaveBeenLastCalledWith(0)
	progress.removeListener(listener)
})
