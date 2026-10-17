import { Image, type ImageStyle } from 'expo-image'
import React, { useState } from 'react'
import type { StyleProp } from 'react-native'

import defaultArtwork from '../../../assets/images/default-home-background.jpg'
import { useAppSettings } from '../../state/AppSettingsContext'

type ArtworkProps = {
	url: string | undefined
	style: StyleProp<ImageStyle>
	transition: number
	label?: string
}

/** Renders cached speaker artwork and remembers failed URLs until the artwork changes. */
export function PlaybackArtwork({ url, style, transition, label }: ArtworkProps) {
	const { reducedMotion } = useAppSettings()
	const [failedUrl, setFailedUrl] = useState<string | null>(null)

	return (
		<Image
			source={url && url !== failedUrl ? { uri: url } : defaultArtwork}
			onError={() => setFailedUrl(url ?? null)}
			contentFit="cover"
			transition={reducedMotion ? 0 : transition}
			style={style}
			{...(label === undefined ? {} : { accessibilityLabel: label })}
		/>
	)
}
