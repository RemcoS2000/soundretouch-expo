import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

type NativeConfig = {
	_internal?: {
		modResults?: {
			ios?: {
				infoPlist?: {
					NSLocalNetworkUsageDescription?: string
					NSBonjourServices?: string[]
					NSAppTransportSecurity?: { NSAllowsLocalNetworking?: boolean }
				}
			}
			android?: { manifest?: { manifest?: { application?: { $?: Record<string, string> }[] } } }
		}
	}
}

const file = process.argv[2]
assert.ok(file, 'Pass the generated native configuration JSON path')
const config = JSON.parse(readFileSync(file, 'utf8')) as NativeConfig
const info = config._internal?.modResults?.ios?.infoPlist
const manifest = config._internal?.modResults?.android?.manifest

assert.equal(info?.NSLocalNetworkUsageDescription?.includes('SoundTouch'), true)
assert.deepEqual(info?.NSBonjourServices, ['_soundtouch._tcp'])
assert.equal(info?.NSAppTransportSecurity?.NSAllowsLocalNetworking, true)
assert.equal(manifest?.manifest?.application?.[0]?.$?.['android:usesCleartextTraffic'], 'true')
console.log('Generated iOS local-network and Android cleartext configuration verified.')
