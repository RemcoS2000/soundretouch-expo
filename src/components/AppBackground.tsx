import type { SoundTouchDevice } from '@soundretouch/api/device'

import React, { useEffect, useState } from 'react'
import { Animated, StyleSheet, View } from 'react-native'

import defaultBackgroundImage from '../../assets/images/default-home-background.jpg'
import { useNowPlaying } from '../hooks/useNowPlaying'
import { useAppSettings } from '../state/AppSettingsContext'

const FADE_MS = 320
const MAX_OPACITY = 0.84

type AppBackgroundProps = {
	device: SoundTouchDevice | null
}

export function AppBackground({ device }: AppBackgroundProps) {
	const { artUrl } = useNowPlaying(device)
	const { colors } = useAppSettings()
	const [opacity] = useState(() => new Animated.Value(MAX_OPACITY))
	const imageSource = artUrl ? { uri: artUrl } : defaultBackgroundImage

	useEffect(() => {
		opacity.setValue(0)
		Animated.timing(opacity, {
			toValue: MAX_OPACITY,
			duration: FADE_MS,
			useNativeDriver: true,
		}).start()
	}, [artUrl, opacity])

	return (
		<>
			<Animated.Image source={imageSource} resizeMode="cover" style={[styles.backgroundArt, { opacity }]} blurRadius={36} />
			<View pointerEvents="none" style={[styles.backgroundOverlay, { backgroundColor: colors.overlayBackground }]} />
		</>
	)
}

const styles = StyleSheet.create({
	backgroundArt: {
		...StyleSheet.absoluteFillObject,
	},
	backgroundOverlay: {
		...StyleSheet.absoluteFillObject,
	},
})
