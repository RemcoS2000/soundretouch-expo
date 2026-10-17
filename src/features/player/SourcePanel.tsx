import type MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { NowPlaying, SoundTouchDevice, SourceItem } from '@soundretouch/api/device'

import React, { useState } from 'react'
import { Linking, Text } from 'react-native'

import { errorMessage, Loading, Notice } from '../../design-system/Screen'
import { useSources } from '../../hooks/useSources'
import { useAppSettings } from '../../state/AppSettingsContext'
import { reportAsync } from '../../utils/async'
import { useSpeakerResource } from '../speakers/queries'

import { SheetAction, SheetSection } from './SheetControls'

/**
 * Lists available sources while preserving the identity of each source account.
 */
export function SourcePanel({ device }: { device: SoundTouchDevice }) {
	const { sourceItems, mutation, query } = useSources(device)
	const playing = useSpeakerResource(device, 'nowPlaying')
	const { colors } = useAppSettings()
	const [launchError, setLaunchError] = useState<string | null>(null)

	return (
		<SheetSection title="Sources">
			{query.isLoading && <Loading />}
			<Notice
				message={errorMessage(query.error ?? mutation.error) ?? launchError}
				retry={() => {
					reportAsync(query.refetch())
				}}
			/>
			{!query.isLoading && !sourceItems.length && <Text style={{ color: colors.textMuted }}>No available sources reported by this speaker.</Text>}
			{sourceItems.map((item) => {
				const current = isCurrentSource(playing.data, item)

				return (
					<SheetAction
						key={`${item.source}:${item.sourceAccount ?? ''}`}
						label={item.name || item.source || 'Unknown source'}
						detail={item.source?.replace(/_/g, ' ')}
						icon={SOURCE_ICONS[item.source ?? ''] ?? 'music-note'}
						selected={current}
						disabled={current}
						pending={mutation.pendingInputs.some((pending) => pending.source === item.source && pending.sourceAccount === item.sourceAccount)}
						onPress={() => mutation.mutate(item)}
					/>
				)
			})}
			{sourceItems.some((item) => item.source === 'SPOTIFY') && (
				<SheetAction
					label="Open Spotify"
					icon="open-in-new"
					onPress={() => {
						void Linking.openURL('spotify://').catch(() => setLaunchError('Spotify could not be opened. Install the app or open it manually.'))
					}}
				/>
			)}
		</SheetSection>
	)
}

const SOURCE_ICONS: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = { BLUETOOTH: 'bluetooth', AUX: 'cable' }

/** Compares both source and account so separate accounts never share selection state. */
function isCurrentSource(playing: NowPlaying | undefined, item: SourceItem): boolean {
	return playing?.source === item.source && String(playing?.ContentItem?.sourceAccount ?? '') === String(item.sourceAccount ?? '')
}
