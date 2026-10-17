import { Redirect } from 'expo-router'
import React from 'react'

/**
 * Preserves speaker-selection links by opening the dropdown on Now Playing.
 */
export default function SpeakersRoute() {
	return <Redirect href={{ pathname: '/', params: { speakers: 'open' } }} />
}
