import { NativeModules } from 'react-native'
import Zeroconf from 'react-native-zeroconf'

import type { DiscoveryBrowser } from './discoverSoundTouchDevices'

export const isDiscoverySupported = true

/**
 * Creates the native discovery browser, reporting a missing development-build module explicitly.
 */
export function createDiscoveryBrowser(): DiscoveryBrowser {
	if (!NativeModules.RNZeroconf) {
		throw new Error('The native discovery module is unavailable.')
	}

	return new Zeroconf()
}
