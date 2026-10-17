import { createRequire } from 'node:module'

import { reactNative } from 'vitest-native'
import { defineConfig } from 'vitest/config'

const require = createRequire(import.meta.url)

export default defineConfig({
	// Preserve per-file isolation without relying on the adapter's experimental pooled runtime.
	plugins: [reactNative({ engine: 'native', hotRuntime: false })],
	// The native renderer and RNTL must share one renderer module and its host configuration.
	resolve: { alias: { 'test-renderer': require.resolve('test-renderer') } },
	test: {
		globals: true,
		env: { EXPO_OS: 'ios' },
		include: ['tests/**/*.spec.{ts,tsx}'],
		setupFiles: ['tests/setup.ts'],
		maxWorkers: 1,
	},
})
