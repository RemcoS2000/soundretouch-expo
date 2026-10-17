import { normalizeHost, normalizeId, parseSpeakers } from '../src/features/speakers/identity'

test('migrates valid legacy records, skips malformed rows and deduplicates identities', () => {
	const entries = parseSpeakers(
		JSON.stringify([
			{ host: 'Speaker.local.', info: { deviceID: 'aa:bb', name: 'Office' } },
			{ host: '192.168.1.4', info: { deviceID: 'AABB' } },
			{ host: 4 },
			{ host: 'bad/url' },
			{ host: '192.168.1.5', info: { name: 42 } },
			{ host: '192.168.1.6' },
		])
	)
	expect(entries.map((entry) => entry.host)).toEqual(['speaker.local', '192.168.1.6'])
	expect(normalizeId('aa-bb')).toBe('AABB')
})
test('accepts versioned storage and rejects unknown versions without overwriting data', () => {
	expect(parseSpeakers('{"version":2,"devices":[{"host":"192.168.1.2"}]}')).toHaveLength(1)
	expect(() => parseSpeakers('{"version":3,"devices":[]}')).toThrow('unsupported')
	expect(() => parseSpeakers('not json')).toThrow()
})
test('validates plain hosts and bracketed IPv6 without accepting URLs or ports', () => {
	expect(normalizeHost('[::1]')).toBe('[::1]')
	for (const host of ['http://speaker', 'speaker:8090', 'speaker/path', '']) expect(() => normalizeHost(host)).toThrow()
})
