import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Animated, Platform } from 'react-native'

/**
 * Owns dropdown requests, animation progress and focus restoration independently of playback.
 */
export function useSpeakerMenu(requested: boolean) {
	const router = useRouter()
	const [open, setOpen] = useState(requested)
	const [previousRequest, setPreviousRequest] = useState(requested)
	const [progress] = useState(() => new Animated.Value(0))

	/**
	 * Restores the keyboard opener when speaker selection closes.
	 */
	const close = useCallback(() => {
		setOpen(false)
		if (Platform.OS === 'web') {
			document.querySelector<HTMLElement>('[aria-label="Choose speaker"]')?.focus()
		}
	}, [])

	if (previousRequest !== requested) {
		setPreviousRequest(requested)
		if (requested) {
			setOpen(true)
		}
	}

	useEffect(() => {
		if (requested) {
			router.setParams({ speakers: undefined })
		}
	}, [requested, router])

	useFocusEffect(useCallback(() => () => setOpen(false), []))

	return { open, setOpen, progress, close }
}
