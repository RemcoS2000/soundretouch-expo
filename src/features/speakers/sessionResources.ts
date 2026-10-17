import type { DeviceInfo, SoundTouchDevice } from '@soundretouch/api/device'

import { reportAsync } from '../../utils/async'

import { normalizeId } from './identity'
import { queryClient, type Resource, type ResourceData, resourceKey } from './speakerCache'

type IdentityGuard = ReturnType<typeof createIdentityGuard>

/** Reads a reported identity without trusting unknown event payload shapes. */
function reportedId(data: unknown): string | undefined {
	if (data && typeof data === 'object' && 'deviceID' in data && typeof data.deviceID === 'string') {
		return data.deviceID
	}

	return undefined
}

/** Preserves confirmed identity across reconnects while requiring each new connection to verify it. */
export function createIdentityGuard(id: string) {
	let expectedId = id.startsWith('host:') ? '' : id
	let verified = false
	let mismatched = false

	return {
		get verified() {
			return verified
		},
		get mismatched() {
			return mismatched
		},
		/** Clears transport verification without forgetting an identity conflict. */
		reset() {
			verified = false
		},
		/** Validates event identity before allowing its payload into the cache. */
		acceptEvent(data: unknown) {
			const actual = reportedId(data)

			if (actual === undefined) {
				return true
			}
			if (expectedId && normalizeId(actual) !== expectedId) {
				mismatched = true

				return false
			}
			verified = true

			return true
		},
		/** Confirms snapshots against the saved identity before commands can proceed. */
		acceptSnapshot(data: ResourceData) {
			const actual = reportedId(data)

			if (!actual) {
				return
			}
			if (expectedId && normalizeId(actual) !== expectedId) {
				mismatched = true

				throw new Error('Speaker identity changed at this address. Rediscover the speaker.')
			}
			expectedId = normalizeId(actual)
			verified = true
			mismatched = false
		},
	}
}

/** Applies event revisions and coalesces payload-free notifications for the affected resource only. */
function createResourceEvents(id: string, identity: IdentityGuard) {
	const revisions = new Map<Resource, number>()
	const payloadRevisions = new Map<Resource, number>()
	const timers = new Map<Resource, ReturnType<typeof setTimeout>>()
	/** Returns the current revision, including payload-free invalidations. */
	const revision = (resource: Resource) => revisions.get(resource) ?? 0
	/** Marks one resource stale without refetching unrelated speaker data. */
	const refresh = (resource: Resource) => queryClient.invalidateQueries({ queryKey: resourceKey(id, resource), exact: true })

	return {
		revision,
		refresh,
		/** Publishes complete payloads after checking their reported identity. */
		publish(resource: Resource, data: unknown) {
			if (!identity.acceptEvent(data)) {
				reportAsync(refresh('info'))

				return
			}
			revisions.set(resource, revision(resource) + 1)
			payloadRevisions.set(resource, revision(resource))
			queryClient.setQueryData(resourceKey(id, resource), data)
		},
		/** Schedules one refresh for a burst of notifications without complete data. */
		invalidate(resource: Resource) {
			revisions.set(resource, revision(resource) + 1)
			if (timers.has(resource)) {
				return
			}
			timers.set(
				resource,
				setTimeout(() => {
					timers.delete(resource)
					reportAsync(refresh(resource))
				}, 150)
			)
		},
		/** Returns newer complete event data; an invalidation alone still needs another read. */
		payloadSince<R extends Resource>(resource: R, previous: number) {
			if ((payloadRevisions.get(resource) ?? 0) > previous) {
				return queryClient.getQueryData<ResourceData<R>>(resourceKey(id, resource))
			}

			return undefined
		},
		/** Releases pending refresh timers when resource demand stops. */
		stop() {
			timers.forEach(clearTimeout)
			timers.clear()
		},
	}
}

type ResourceEvents = ReturnType<typeof createResourceEvents>

/** Owns a request's cancellation listener until the read settles. */
function requestController(signal: AbortSignal | undefined, controllers: Set<AbortController>) {
	const controller = new AbortController()
	/** Forwards caller cancellation without sharing its controller with other reads. */
	const abort = () => controller.abort()

	if (signal?.aborted) {
		controller.abort()
	}
	signal?.addEventListener('abort', abort, { once: true })
	controllers.add(controller)

	return {
		controller,
		release: () => {
			controllers.delete(controller)
			signal?.removeEventListener('abort', abort)
		},
	}
}

/** Owns cancellation generations so an old HTTP response cannot replace a newer event or reconnect. */
function createResourceReader(device: SoundTouchDevice, events: ResourceEvents, identity: IdentityGuard, onInfo?: (info: DeviceInfo) => void) {
	const controllers = new Set<AbortController>()
	let generation = 0
	let disposed = false

	/** Reads a bounded snapshot and reconciles event revisions before returning it. */
	const read = async <R extends Resource>(resource: R, signal?: AbortSignal): Promise<ResourceData<R>> => {
		if (disposed) {
			throw new Error('Speaker disposed')
		}
		const requestGeneration = generation
		const revision = events.revision(resource)
		const { controller, release } = requestController(signal, controllers)

		try {
			// TypeScript loses the key/result relationship when indexing device methods.
			// Keep this assertion at the protocol boundary instead of repeating it in callers.
			const data = (await device[resource]({ signal: controller.signal })) as ResourceData<R>

			if (requestGeneration !== generation || controller.signal.aborted) {
				throw Object.assign(new Error('Request cancelled'), { name: 'AbortError' })
			}
			identity.acceptSnapshot(data)
			if (revision !== events.revision(resource)) {
				const cached = events.payloadSince(resource, revision)

				return cached || read(resource, signal)
			}
			if (resource === 'info') {
				onInfo?.(data as DeviceInfo)
			}

			return data
		} finally {
			release()
		}
	}

	/** Cancels the current generation and clears transport identity verification. */
	const cancel = () => {
		generation++
		identity.reset()
		controllers.forEach((controller) => controller.abort())
		controllers.clear()
	}

	return {
		read,
		cancel,
		get disposed() {
			return disposed
		},
		/** Prevents future reads and cancels any work already in progress. */
		dispose: () => {
			disposed = true
			cancel()
		},
	}
}

/** Composes resource events and reads without owning sockets or command policy. */
export function createSessionResources(device: SoundTouchDevice, id: string, identity: IdentityGuard, onInfo?: (info: DeviceInfo) => void) {
	const events = createResourceEvents(id, identity)
	const reader = createResourceReader(device, events, identity, onInfo)

	return {
		...events,
		read: reader.read,
		get disposed() {
			return reader.disposed
		},
		dispose: reader.dispose,
		/** Cancels pending snapshots and delayed invalidations when demand stops. */
		stop() {
			events.stop()
			reader.cancel()
		},
		/** Removes both resource and transport cache entries after permanent disposal. */
		removeCache() {
			queryClient.removeQueries({ queryKey: ['speaker', id] })
			queryClient.removeQueries({ queryKey: ['transport', id] })
		},
	}
}
