import type { SoundTouchDevice, Zone, ZoneConfig, ZoneSlaveConfig } from '@soundretouch/api/device'

import { type Mock, vi } from 'vitest'

import { canJoin, type GroupSnapshot, networkMember, resolveMaster } from '../src/features/groups/groups'
import { changeGroup } from '../src/features/groups/groups'
import { queryClient, registerSession } from '../src/features/speakers/session'
import type { SoundTouchDeviceEntry } from '../src/state/SoundTouchDevicesContext'

import { requiredAt } from './requiredAt'

function snapshot(id: string, master?: string): GroupSnapshot {
	const entry = { device: { host: '192.168.1.2' }, info: { deviceID: id } } as SoundTouchDeviceEntry
	return { entry, info: entry.info!, zone: master ? { master } : {}, member: { ipaddress: '192.168.1.2', macAddress: id } }
}
test('group membership follows canonical identity, not hostname', () => {
	const master = snapshot('AABB')
	const slave = snapshot('CCDD', 'aa:bb')
	expect(resolveMaster(slave, [master, slave])).toBe(master)
	expect(canJoin(master, snapshot('EEFF', 'ZZZZ'))).toBe(false)
	expect(canJoin(master, slave)).toBe(true)
	expect(() => resolveMaster(slave, [slave])).toThrow('master')
})
test('uses reported network IP for hostname connections and does not guess missing identity', () => {
	const entry = { device: { host: 'speaker.local' } } as SoundTouchDeviceEntry
	expect(networkMember(entry, { deviceID: 'aa:bb', networkInfo: [{ ipAddress: '192.168.1.5' }] })).toEqual({ ipaddress: '192.168.1.5', macAddress: 'AABB' })
	expect(() => networkMember(entry, {})).toThrow('network address')
})

function speakers() {
	const zones: Record<string, Zone> = { AABB: {}, CCDD: {}, EEFF: {} }
	const entries = Object.keys(zones).map((id, index) => {
		const host = `192.168.1.${index + 2}`
		const device = {
			host,
			info: vi.fn(async () => ({ deviceID: id, name: id })),
			zone: vi.fn(async () => zones[id]),
			setZone: vi.fn(async (config: ZoneConfig) => {
				const zone = { master: config.master, member: config.members }
				config.members.forEach((member) => {
					zones[member.macAddress] = zone
				})
			}),
			addZoneSlave: vi.fn(async (config: ZoneSlaveConfig) => {
				const old = zones[id]?.member ?? []
				const members = [...(Array.isArray(old) ? old : [old]), ...config.members]
				members.forEach((member) => {
					zones[member.macAddress!] = { master: config.master, member: members }
				})
			}),
			removeZoneSlave: vi.fn(async (config: ZoneSlaveConfig) => {
				const old = zones[id]?.member ?? []
				const members = (Array.isArray(old) ? old : [old]).filter(
					(member) => !config.members.some((removed) => removed.macAddress === member.macAddress)
				)
				config.members.forEach((member) => {
					zones[member.macAddress] = {}
				})
				members.forEach((member) => {
					zones[member.macAddress!] = { master: config.master, member: members }
				})
			}),
			disconnect: vi.fn(),
			dispose: vi.fn(),
		} as unknown as SoundTouchDevice
		registerSession(device, id)
		return { device, info: { deviceID: id, name: id } }
	})
	return { entries, zones }
}
afterEach(() => queryClient.clear())
test('creates groups, resolves a member to its master, and verifies leaving and ungrouping', async () => {
	const { entries, zones } = speakers()
	expect(await changeGroup(entries, requiredAt(entries, 0), 'add', 'CCDD')).toContain('verified')
	expect(requiredAt(entries, 0).device.setZone).toHaveBeenCalledWith({
		master: 'AABB',
		senderIPAddress: '192.168.1.2',
		members: [
			{ ipaddress: '192.168.1.2', macAddress: 'AABB' },
			{ ipaddress: '192.168.1.3', macAddress: 'CCDD' },
		],
	})
	await changeGroup(entries, requiredAt(entries, 1), 'add', 'EEFF')
	expect(requiredAt(entries, 0).device.addZoneSlave).toHaveBeenCalled()
	await changeGroup(entries, requiredAt(entries, 1), 'leave')
	expect(zones.CCDD).toEqual({})
	await changeGroup(entries, requiredAt(entries, 0), 'ungroup')
	expect(zones.EEFF).toEqual({})
})
test('blocks another group and excludes it from play everywhere', async () => {
	const { entries, zones } = speakers()
	zones.CCDD = { master: 'OTHER' }
	await expect(changeGroup(entries, requiredAt(entries, 0), 'add', 'CCDD')).rejects.toThrow('existing group')
	const result = await changeGroup(entries, requiredAt(entries, 0), 'everywhere')
	expect(result).toContain('belongs to another group')
	expect(zones.CCDD.master).toBe('OTHER')
	expect(zones.EEFF?.master).toBe('AABB')
})
test('reports an uncertain command while reconciling the actual changed members', async () => {
	const { entries, zones } = speakers()
	;(requiredAt(entries, 0).device.setZone as Mock).mockImplementation(async (config: ZoneConfig) => {
		config.members.forEach((member) => {
			zones[member.macAddress] = { master: config.master, member: config.members }
		})
		throw new Error('timeout')
	})
	const result = await changeGroup(entries, requiredAt(entries, 0), 'add', 'CCDD')
	expect(result).toContain('outcome uncertain')
	expect(result).toContain('verified')
	expect(requiredAt(entries, 0).device.setZone).toHaveBeenCalledTimes(1)
})

test('allows the master to remove an unavailable member and reports incomplete confirmation', async () => {
	const { entries, zones } = speakers()
	await changeGroup(entries, requiredAt(entries, 0), 'add', 'CCDD')
	;(requiredAt(entries, 1).device.info as Mock).mockRejectedValue(new Error('offline'))
	const result = await changeGroup(entries, requiredAt(entries, 0), 'remove', 'CCDD')
	expect(requiredAt(entries, 0).device.removeZoneSlave).toHaveBeenCalled()
	expect(zones.CCDD).toEqual({})
	expect(result).toContain('could not be confirmed')
})
