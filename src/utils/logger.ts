const isDev = typeof __DEV__ !== 'undefined' && __DEV__

/**
 * Formats log timestamps consistently as ISO date strings.
 */
function timestamp() {
	return new Date().toISOString()
}

export const log = {
	debug: (...args: unknown[]) => isDev && console.debug(`[DEBUG] [${timestamp()}]`, ...args),
	info: (...args: unknown[]) => isDev && console.info(`[INFO] [${timestamp()}]`, ...args),
	warn: (...args: unknown[]) => console.warn(`[WARN] [${timestamp()}]`, ...args),
	error: (...args: unknown[]) => console.error(`[ERROR] [${timestamp()}]`, ...args),
}
