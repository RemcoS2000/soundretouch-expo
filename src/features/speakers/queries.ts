import type { SoundTouchDevice, TransportState } from '@soundretouch/api/device'
import { skipToken, useQuery } from '@tanstack/react-query'

import { useIsFocused } from 'expo-router'
import { useEffect } from 'react'

import { useSoundTouchDevices } from '../../state/SoundTouchDevicesContext'

import { getSession, type Resource, type ResourceData, resourceKey } from './session'

const SLOW_RESOURCES = new Set<Resource>(['info', 'sources', 'presets'])

/**
 * Retains and retrieves one resource only while the focused screen demands it.
 */
export function useSpeakerResource<R extends Resource>(device: SoundTouchDevice | null, resource: R, demand = true) {
	const focused = useIsFocused()
	const { foreground } = useSoundTouchDevices()
	const session = device ? getSession(device) : null

	useEffect(() => {
		if (!focused || !foreground || !demand || !session) {
			return
		}

		return session.retain(resource)
	}, [session, resource, focused, foreground, demand])

	return useQuery<ResourceData<R>>({
		queryKey: resourceKey(session?.id ?? 'none', resource),
		queryFn: session ? ({ signal }) => session.read(resource, signal) : skipToken,
		enabled: !!session && focused && foreground && demand,
		staleTime: SLOW_RESOURCES.has(resource) ? 300000 : 30000,
	})
}

/**
 * Observes transport state published by the session without fetching or opening another socket.
 */
export function useSpeakerConnection(device: SoundTouchDevice) {
	return useQuery<TransportState>({ queryKey: ['transport', getSession(device).id], queryFn: skipToken, enabled: false, initialData: 'disconnected' })
}
