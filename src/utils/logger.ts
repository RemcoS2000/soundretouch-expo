// utils/logger.ts

const isDev = __DEV__ // true in Expo dev builds

// Helper to format timestamp
function timestamp() {
	return new Date().toISOString() // e.g., "2026-01-10T14:35:22.123Z"
}

export const log = {
	debug: (...args: unknown[]) => isDev && console.debug(`[DEBUG] [${timestamp()}]`, ...args),
	info: (...args: unknown[]) => isDev && console.info(`[INFO] [${timestamp()}]`, ...args),
	warn: (...args: unknown[]) => console.warn(`[WARN] [${timestamp()}]`, ...args),
	error: (...args: unknown[]) => console.error(`[ERROR] [${timestamp()}]`, ...args),
}
