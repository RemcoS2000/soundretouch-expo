import type { DiscoveryBrowser } from './discoverSoundTouchDevices'

export const isDiscoverySupported = false

/**
 * Reports that discovery is unavailable on web, where speakers are added manually.
 */
export function createDiscoveryBrowser(): DiscoveryBrowser {
	throw new Error('Discovery requires the Android or iOS app.')
}
