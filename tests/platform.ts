import { Platform } from 'react-native'
import { onTestFinished } from 'vitest'

/** Selects browser-only branches without replacing the native component renderer, then restores the platform. */
export function mockWebPlatform() {
	const original = Object.getOwnPropertyDescriptor(Platform, 'OS')

	Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' })
	onTestFinished(() => {
		if (original) {
			Object.defineProperty(Platform, 'OS', original)
		}
	})
}
