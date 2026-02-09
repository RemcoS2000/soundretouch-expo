import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { SoundTouchDevice } from '@soundretouch/api/device';
import { useNowPlaying } from '../../../hooks/useNowPlaying';

const BACKGROUND_FADE_MS = 320;
const BACKGROUND_MAX_OPACITY = 0.84;

type HomeBackgroundProps = {
	/** Active device used to resolve current artwork. When `null`, only the readability overlay is shown. */
	device: SoundTouchDevice | null;
};

export function HomeBackground({ device }: HomeBackgroundProps) {
	// Read currently playing artwork from the active device.
	const { artUrl } = useNowPlaying(device);
	const [artFade] = useState(() => new Animated.Value(0));

	// Fade the active artwork in/out when the current track artwork changes.
	useEffect(() => {
		artFade.setValue(0);
		Animated.timing(artFade, {
			toValue: artUrl ? BACKGROUND_MAX_OPACITY : 0,
			duration: BACKGROUND_FADE_MS,
			useNativeDriver: true,
		}).start();
	}, [artUrl, artFade]);

	return (
		<>
			{/* Artwork layer fades in for the currently active track. */}
			{artUrl ? (
				<Animated.Image source={{ uri: artUrl }} style={[styles.backgroundArt, { opacity: artFade }]} blurRadius={36} />
			) : null}

			{/* Readability layer to keep text/controls legible on busy cover art. */}
			<View pointerEvents="none" style={styles.backgroundOverlay} />
		</>
	);
}

const styles = StyleSheet.create({
	backgroundArt: {
		...StyleSheet.absoluteFillObject,
		opacity: BACKGROUND_MAX_OPACITY,
	},
	backgroundOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(255,255,255,0.54)',
	},
});
