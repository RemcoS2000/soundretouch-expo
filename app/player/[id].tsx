import { Redirect, useLocalSearchParams } from 'expo-router'
import React, { useEffect } from 'react'

import { useActiveSpeaker } from '../../src/state/ActiveSpeakerContext'

/**
 * Preserves direct player links by selecting the requested speaker and opening Now Playing.
 */
export default function PlayerLink() {
	const { id } = useLocalSearchParams<{ id: string }>()
	const { selectSpeaker } = useActiveSpeaker()

	useEffect(() => {
		if (id) {
			selectSpeaker(id)
		}
	}, [id, selectSpeaker])

	return <Redirect href="/" />
}
