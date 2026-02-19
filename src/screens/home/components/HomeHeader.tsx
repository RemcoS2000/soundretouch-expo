import { MaterialIcons } from '@expo/vector-icons'
import type { SoundTouchDevice } from '@soundretouch/api/device'

import React, { useEffect, useState } from 'react'
import { Animated, Image, StyleSheet, Text, View } from 'react-native'

import { useNowPlaying } from '../../../hooks/useNowPlaying'
import { useAppSettings } from '../../../state/AppSettingsContext'
import { getSourceIconName } from '../../../utils'

type HomeHeaderProps = {
	device: SoundTouchDevice | null
	isExpanded: boolean
}

export function HomeHeader({ device, isExpanded }: HomeHeaderProps) {
	const { colors } = useAppSettings()
	const { nowPlaying } = useNowPlaying(device)

	// Extract nowPlaying details
	const title = nowPlaying?.track || nowPlaying?.ContentItem?.itemName || ''
	const artist = nowPlaying?.artist || ''
	const artUrl = nowPlaying?.art?.url

	const showMiniNowPlaying = isExpanded && Boolean(title || artist)
	const [progress] = useState(() => new Animated.Value(showMiniNowPlaying ? 1 : 0))

	useEffect(() => {
		Animated.timing(progress, {
			toValue: showMiniNowPlaying ? 1 : 0,
			duration: 200,
			useNativeDriver: true,
		}).start()
	}, [showMiniNowPlaying, progress])

	return (
		<View style={styles.root}>
			<Animated.View
				pointerEvents="none"
				style={[
					styles.layer,
					{
						opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
						transform: [
							{
								translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }),
							},
						],
					},
				]}
			>
				<Text style={[styles.appTitle, { color: colors.text }]}>SoundReTouch</Text>
			</Animated.View>

			<Animated.View
				pointerEvents="none"
				style={[
					styles.layer,
					{
						opacity: progress,
						transform: [
							{
								translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }),
							},
						],
					},
				]}
			>
				<View style={styles.container}>
					{artUrl ? (
						<Image source={{ uri: artUrl }} style={styles.artwork} />
					) : (
						<View style={[styles.artwork, styles.artworkFallback, { backgroundColor: colors.artworkFallback }]}>
							<MaterialIcons name={getSourceIconName(nowPlaying?.source)} size={16} color={colors.icon} />
						</View>
					)}
					<View style={styles.textWrap}>
						{title ? (
							<Text style={[styles.title, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
								{title}
							</Text>
						) : null}
						{artist ? (
							<Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1} ellipsizeMode="tail">
								{artist}
							</Text>
						) : null}
					</View>
				</View>
			</Animated.View>
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		marginRight: 12,
		minWidth: 0,
		height: 34,
		justifyContent: 'center',
	},
	layer: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
	},
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		minWidth: 0,
	},
	appTitle: {
		fontSize: 28,
		fontWeight: '700',
	},
	artwork: {
		width: 32,
		height: 32,
		borderRadius: 8,
		backgroundColor: '#d1d5db',
	},
	artworkFallback: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	textWrap: {
		marginLeft: 10,
		flex: 1,
		minWidth: 0,
	},
	title: {
		fontSize: 14,
		fontWeight: '700',
	},
	subtitle: {
		marginTop: 2,
		fontSize: 12,
	},
})
