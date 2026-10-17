import type { SoundTouchDevice } from '@soundretouch/api/device'
import { useMutation, useMutationState } from '@tanstack/react-query'

import { useId } from 'react'

import { getSession, type Resource } from './session'

/**
 * Runs a mutation through the per-speaker queue and reconciles the affected resources.
 */
export function useSpeakerCommand<T>(
	device: SoundTouchDevice | null,
	action: (device: SoundTouchDevice, input: T) => Promise<void>,
	resources: Resource[] = ['nowPlaying'],
	options: { relative?: boolean } = {}
) {
	const commandId = useId()
	const mutationKey = ['speaker-command', commandId]
	const pendingInputs = useMutationState<T>({
		filters: { mutationKey, exact: true, status: 'pending' },
		select: (mutation) => mutation.state.variables as T,
	})
	const mutation = useMutation({
		mutationKey,
		mutationFn: async (input: T) => {
			if (!device) {
				throw new Error('Select a speaker first.')
			}

			await getSession(device).command(() => action(device, input), resources, options)
		},
	})

	// Keep each queued input pending, even when another button starts a newer mutation.
	return { ...mutation, pendingInputs, isPendingFor: (input: T) => pendingInputs.includes(input) }
}

// Sending only the most recent waiting value avoids replaying old slider positions.
const volumes = new WeakMap<SoundTouchDevice, { value: number; promise: Promise<void> }>()

/**
 * Coalesces waiting volume changes so the command queue sends only the latest slider value.
 */
export function setSpeakerVolume(device: SoundTouchDevice, value: number): Promise<void> {
	const waiting = volumes.get(device)

	if (waiting) {
		waiting.value = value

		return waiting.promise
	}

	const pending = { value, promise: Promise.resolve() }

	pending.promise = getSession(device)
		.command(async () => {
			volumes.delete(device)
			await device.setVolume(pending.value, false)
		}, ['volume'])
		.finally(() => {
			if (volumes.get(device) === pending) {
				volumes.delete(device)
			}
		})
	volumes.set(device, pending)

	return pending.promise
}
