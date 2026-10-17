import type { SoundTouchDevice, TransportState } from '@soundretouch/api/device'

import { reportAsync } from '../../utils/async'

import type { createSessionResources } from './sessionResources'
import { queryClient, type Resource } from './speakerCache'

type Resources = ReturnType<typeof createSessionResources>
type Demand = Map<Resource, number>

/** Subscribes to complete event payloads or invalidates resources with notification-only events. */
function subscribe(device: SoundTouchDevice, resource: Resource, resources: Resources): () => void {
	switch (resource) {
		case 'nowPlaying':
			return device.onNowPlayingUpdated((data) => resources.publish(resource, data))
		case 'volume':
			return device.onVolumeUpdated((data) => resources.publish(resource, data))
		case 'presets':
			return device.onPresetsUpdated((data) => resources.publish(resource, data))
		case 'info':
			return device.onInfoUpdated(() => resources.invalidate(resource))
		case 'zone':
			return device.onZoneUpdated(() => resources.invalidate(resource))
		case 'sources':
			return device.onSourcesUpdated(() => resources.invalidate(resource))
	}
}

type Observation = { id: string; demands: Demand; resources: Resources; isForeground: () => boolean }

/** Watches transport transitions and polls only demanded dynamic data while the socket is unavailable. */
function observeTransport(device: SoundTouchDevice, { id, demands, resources, isForeground }: Observation) {
	let transport: TransportState = 'disconnected'
	const off = device.onTransportStateChanged((state) => {
		transport = state
		queryClient.setQueryData(['transport', id], state)
		if (state === 'open') {
			demands.forEach((_, resource) => reportAsync(resources.refresh(resource)))
		}
	})
	const polling = setInterval(() => {
		if (isForeground() && transport !== 'open') {
			demands.forEach((_, resource) => {
				if (!['info', 'sources', 'presets'].includes(resource)) {
					reportAsync(resources.refresh(resource))
				}
			})
		}
	}, 10000)

	return () => {
		off()
		clearInterval(polling)
	}
}

/** Owns live subscriptions only while foreground consumers retain resource demand. */
export function createSessionTransport(device: SoundTouchDevice, id: string, resources: Resources, isForeground: () => boolean) {
	const demands: Demand = new Map()
	const subscriptions = new Map<Resource, () => void>()
	let stopObservation: (() => void) | undefined

	/** Releases all live work without forgetting which resources must resume later. */
	const stop = () => {
		subscriptions.forEach((off) => off())
		subscriptions.clear()
		stopObservation?.()
		stopObservation = undefined
		resources.stop()
		device.disconnect()
	}
	/** Matches subscriptions and socket readiness to current demand. */
	const sync = () => {
		if (!isForeground() || !demands.size || resources.disposed) {
			stop()

			return
		}
		if (!stopObservation) {
			stopObservation = observeTransport(device, { id, demands, resources, isForeground })
		}
		demands.forEach((_, resource) => {
			if (!subscriptions.has(resource)) {
				subscriptions.set(resource, subscribe(device, resource, resources))
			}
		})
		device.connect()
	}

	return {
		stop,
		/** Retains resource demand until its consumer releases it. */
		retain: (resource: Resource) => {
			demands.set(resource, (demands.get(resource) ?? 0) + 1)
			sync()

			return () => {
				const count = (demands.get(resource) ?? 1) - 1

				if (count) {
					demands.set(resource, count)
				} else {
					demands.delete(resource)
					subscriptions.get(resource)?.()
					subscriptions.delete(resource)
				}
				if (!demands.size) {
					stop()
				}
			}
		},
		/** Reconciles demanded resources after foreground or network transitions. */
		resume: () => {
			sync()
			if (isForeground()) {
				demands.forEach((_, resource) => reportAsync(resources.refresh(resource)))
			}
		},
	}
}
