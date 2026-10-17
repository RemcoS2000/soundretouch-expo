import type { DeviceInfo } from '@soundretouch/api/device'

/**
 * Normalizes a reported device ID so MAC address punctuation does not create duplicates.
 */
export const normalizeId = (value?: string) => value?.replace(/[:-]/g, '').toUpperCase() ?? ''

/**
 * Validates and normalizes a speaker address without accepting ports or URLs.
 */
export function normalizeHost(value: string): string {
	const host = value.trim().replace(/\.$/, '').toLowerCase()

	if (!host || /[\s/?#@]/.test(host) || host.includes('://')) {
		throw new Error('Enter an IP address or hostname, without a port or URL.')
	}

	if (host.includes(':') && !/^\[[0-9a-f:]+\]$/i.test(host)) {
		throw new Error('Wrap IPv6 addresses in brackets. Do not include a port.')
	}

	if (!/^[a-z0-9.[\]:_-]+$/i.test(host)) {
		throw new Error('Invalid speaker address.')
	}

	return host
}

/**
 * Uses the confirmed device ID as the stable identity, falling back to the address until verified.
 */
export const speakerId = (host: string, info?: DeviceInfo | null) => normalizeId(info?.deviceID) || `host:${host}`

export type StoredSpeaker = { host: string; info: DeviceInfo | null }

/**
 * Reads legacy or versioned storage, retaining valid records and removing duplicate speakers.
 */
export function parseSpeakers(raw: string | null): StoredSpeaker[] {
	if (!raw) {
		return []
	}

	const parsed: unknown = JSON.parse(raw)
	let rows: unknown = null

	if (Array.isArray(parsed)) {
		rows = parsed
	} else if (parsed && typeof parsed === 'object' && 'version' in parsed && parsed.version === 2 && 'devices' in parsed) {
		rows = parsed.devices
	}

	if (!Array.isArray(rows)) {
		throw new Error('Saved speakers have an unsupported format.')
	}

	const seen = new Set<string>()

	return rows.flatMap((row: unknown) => {
		const record = parseSpeakerRecord(row)

		if (!record) {
			return []
		}
		const id = speakerId(record.host, record.info)

		if (seen.has(id) || seen.has(`host:${record.host}`)) {
			return []
		}
		seen.add(id)
		seen.add(`host:${record.host}`)

		return [record]
	})
}

/** Checks the storage row shape before reading its address or metadata. */
function isSpeakerRow(row: unknown): row is { host: string; info?: unknown } {
	return !!row && typeof row === 'object' && 'host' in row && typeof row.host === 'string'
}

/** Retains a valid record without allowing one malformed entry to discard the saved list. */
function parseSpeakerRecord(row: unknown): StoredSpeaker | null {
	if (!isSpeakerRow(row)) {
		return null
	}
	try {
		const host = normalizeHost(row.host)
		const info = row.info && typeof row.info === 'object' ? (row.info as DeviceInfo) : null

		if (info && [info.deviceID, info.name, info.type].some((value) => value !== undefined && typeof value !== 'string')) {
			return null
		}

		return { host, info }
	} catch {
		return null
	}
}
