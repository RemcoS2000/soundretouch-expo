import type { SoundTouchDevice } from '@soundretouch/api/device'

import { Image } from 'expo-image'
import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import defaultBackgroundImage from '../../assets/images/default-home-background.jpg'
import { useSpeakerResource } from '../features/speakers/queries'
import { useAppSettings } from '../state/AppSettingsContext'

type AppBackgroundProps = {
	device: SoundTouchDevice | null
}

/**
 * Restores the blurred artwork background, with the original colorful image as a fallback.
 * A themed overlay keeps the player text readable without hiding the artwork colors.
 */
export function AppBackground({ device }: AppBackgroundProps) {
	const { data: nowPlaying } = useSpeakerResource(device, 'nowPlaying')
	const { isDarkMode, reducedMotion } = useAppSettings()
	const [failedArtwork, setFailedArtwork] = useState<string | null>(null)

	const artworkUrl = nowPlaying?.art?.url
	const imageSource = artworkUrl && artworkUrl !== failedArtwork ? { uri: artworkUrl } : defaultBackgroundImage

	return (
		<View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.container}>
			<Image
				source={imageSource}
				contentFit="cover"
				blurRadius={36}
				transition={reducedMotion ? 0 : 320}
				onError={() => setFailedArtwork(artworkUrl ?? null)}
				style={styles.artwork}
			/>
			<View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(3,6,12,0.76)' : 'rgba(255,255,255,0.88)' }]} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFill,
		overflow: 'hidden',
	},
	artwork: {
		...StyleSheet.absoluteFill,
		opacity: 0.84,
	},
})
