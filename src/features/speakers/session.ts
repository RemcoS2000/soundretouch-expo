import type { DeviceInfo, SoundTouchDevice } from '@soundretouch/api/device'

import { createCommandQueue } from './sessionCommands'
import { createIdentityGuard, createSessionResources } from './sessionResources'
import { createSessionTransport } from './sessionTransport'

export { queryClient, resourceKey, type Resource, type ResourceData } from './speakerCache'

type Session = ReturnType<typeof createSession>

const sessions = new WeakMap<SoundTouchDevice, Session>()
let foreground = true

/** Coordinates resource snapshots, live demand and commands for one provider-owned device. */
export function createSession(device: SoundTouchDevice, id: string, onInfo?: (info: DeviceInfo) => void) {
	const identity = createIdentityGuard(id)
	const resources = createSessionResources(device, id, identity, onInfo)
	const transport = createSessionTransport(device, id, resources, () => foreground)
	const command = createCommandQueue({ id, resources, identity, isForeground: () => foreground })

	return {
		id,
		device,
		read: resources.read,
		retain: transport.retain,
		resume: transport.resume,
		command,
		/** Permanently releases this device and removes its cached resources. */
		dispose() {
			resources.dispose()
			transport.stop()
			device.dispose()
			resources.removeCache()
		},
	}
}

/**
 * Registers the app session for the provider-owned device instance.
 */
export function registerSession(device: SoundTouchDevice, id: string, onInfo?: (info: DeviceInfo) => void) {
	const session = createSession(device, id, onInfo)

	sessions.set(device, session)

	return session
}

/**
 * Returns the registered session. Screens must use devices owned by the speaker provider.
 */
export function getSession(device: SoundTouchDevice) {
	const session = sessions.get(device)

	if (!session) {
		throw new Error('Speaker is not registered')
	}

	return session
}

/**
 * Suspends or resumes speaker sessions when app visibility or the local network changes.
 */
export function setSessionsForeground(active: boolean, devices: SoundTouchDevice[]) {
	foreground = active
	devices.forEach((device) => sessions.get(device)?.resume())
}
