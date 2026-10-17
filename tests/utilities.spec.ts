import { fetch as expoFetch } from 'expo/fetch'
import { vi } from 'vitest'

import { errorMessage } from '../src/design-system/Screen'
import { fetch as fetchViaBridge } from '../src/utils/fetch'
import { getSourceIconName } from '../src/utils/icons'
import { log } from '../src/utils/logger'
import { getSoundtouchProxyUrl, getSoundtouchWebSocketProxyUrl } from '../src/utils/proxy'

import { mockWebPlatform } from './platform'

vi.mock('expo/fetch', () => ({ fetch: vi.fn(async () => new Response('ok')) }))

const environmentKeys = ['EXPO_PUBLIC_USE_DEV_PROXY', 'EXPO_PUBLIC_SOUNDTOUCH_PROXY_URL', 'EXPO_PUBLIC_PROXY_BASE_URL', 'EXPO_PUBLIC_PROXY_PORT'] as const
const original = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]))

beforeEach(() => {
	environmentKeys.forEach((key) => delete process.env[key])
})
afterEach(() => {
	vi.restoreAllMocks()
	environmentKeys.forEach((key) => {
		if (original[key] === undefined) {
			delete process.env[key]
		} else {
			process.env[key] = original[key]
		}
	})
})

test('native requests stay direct and web bridge settings remain explicit', async () => {
	expect(getSoundtouchProxyUrl()).toBeUndefined()
	mockWebPlatform()
	expect(getSoundtouchProxyUrl()).toBe('http://localhost:4100/proxy?url=')
	process.env.EXPO_PUBLIC_PROXY_BASE_URL = 'http://devhost/'
	process.env.EXPO_PUBLIC_PROXY_PORT = '4200'
	expect(getSoundtouchWebSocketProxyUrl()).toBe('ws://devhost:4200/proxy?url=')
	process.env.EXPO_PUBLIC_SOUNDTOUCH_PROXY_URL = 'https://bridge.invalid/proxy?url='
	expect(getSoundtouchWebSocketProxyUrl()).toBe('wss://bridge.invalid/proxy?url=')
	await fetchViaBridge('http://speaker.invalid/info')
	expect(expoFetch).toHaveBeenCalledWith('https://bridge.invalid/proxy?url=http%3A%2F%2Fspeaker.invalid%2Finfo', undefined)
	process.env.EXPO_PUBLIC_USE_DEV_PROXY = 'false'
	expect(getSoundtouchProxyUrl()).toBeUndefined()
	await fetchViaBridge('http://speaker.invalid/info')
	expect(expoFetch).toHaveBeenLastCalledWith('http://speaker.invalid/info', undefined)
})

test.each([
	['aux', 'headset'],
	['SPOTIFY', 'music-note'],
	['TUNEIN', 'radio'],
	['LOCAL_INTERNET_RADIO', 'language'],
	['BLUETOOTH', 'bluetooth'],
	[undefined, 'audiotrack'],
	['unknown', 'audiotrack'],
])('source %s uses the expected icon', (source, icon) => {
	expect(getSourceIconName(source)).toBe(icon)
})

test('connection errors remain actionable and never expose development tooling details', () => {
	expect(errorMessage(null)).toBeNull()
	expect(errorMessage('unknown')).toMatch(/request failed/)
	expect(errorMessage(Object.assign(new Error('timeout'), { name: 'TimeoutError' }))).toMatch(/did not respond in time/)
	expect(errorMessage(new Error('proxy http://localhost'))).toMatch(/local network/)
	expect(errorMessage(Object.assign(new Error('502'), { name: 'HttpError' }))).toMatch(/unavailable/)
	mockWebPlatform()
	expect(errorMessage(new TypeError('fetch failed'))).toMatch(/connection/)
	expect(errorMessage(new Error('Source unavailable'))).toBe('Source unavailable')
})

test('logging preserves severity, context and a timestamp', () => {
	const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
	const info = vi.spyOn(console, 'info').mockImplementation(() => {})
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
	const error = vi.spyOn(console, 'error').mockImplementation(() => {})
	log.debug('debug')
	log.info('info')
	log.warn('warn')
	log.error('error')
	expect(debug).toHaveBeenCalledWith(expect.stringMatching(/^\[DEBUG\] \[\d{4}-/), 'debug')
	expect(info).toHaveBeenCalledWith(expect.stringContaining('[INFO]'), 'info')
	expect(warn).toHaveBeenCalledWith(expect.stringContaining('[WARN]'), 'warn')
	expect(error).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'), 'error')
})
