import React, { createContext, useContext, useMemo, useState } from 'react'

import { speakerId } from '../features/speakers/identity'

import { useSoundTouchDevices } from './SoundTouchDevicesContext'

const Context = createContext<{ activeId: string | null; selectSpeaker: (id: string) => void } | null>(null)

/**
 * Shares the selected speaker across screens and falls back when that speaker is removed.
 */
export function ActiveSpeakerProvider({ children }: { children: React.ReactNode }) {
	const { devices } = useSoundTouchDevices()
	const [selectedId, selectSpeaker] = useState<string | null>(null)
	const first = devices[0]
	const fallbackId = first ? speakerId(first.device.host, first.info) : null
	const activeId = devices.some((entry) => speakerId(entry.device.host, entry.info) === selectedId) ? selectedId : fallbackId

	const value = useMemo(() => ({ activeId, selectSpeaker }), [activeId])

	return <Context.Provider value={value}>{children}</Context.Provider>
}

/**
 * Returns the selected speaker identity and selection action.
 */
export function useActiveSpeaker() {
	const value = useContext(Context)

	if (!value) {
		throw new Error('ActiveSpeakerProvider missing')
	}

	return value
}
