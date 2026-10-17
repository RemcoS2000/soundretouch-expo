import type { SoundTouchDevice } from '@soundretouch/api/device'

import React, { useState } from 'react'
import { Text, View } from 'react-native'

import { errorMessage, IconButton, Notice } from '../../design-system/Screen'
import VolumeSlider from '../../design-system/VolumeSlider'
import { useVolume } from '../../hooks/useVolume'
import { useAppSettings } from '../../state/AppSettingsContext'

/**
 * Previews volume while dragging and sends the final value when the gesture ends.
 */
export function VolumeControl({ device }: { device: SoundTouchDevice }) {
	const { colors } = useAppSettings()
	const { volume, updateVolume, error, isLoading, isUpdating, muteEnabled } = useVolume(device)
	const [preview, setPreview] = useState<number | null>(null)

	const value = preview ?? volume

	return (
		<View style={{ gap: 8 }}>
			<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
				<Text style={{ color: colors.text, fontSize: 16 }}>Volume{muteEnabled ? ' · muted' : ''}</Text>
				<Text style={{ color: colors.textMuted }}>{Math.round(value)}%</Text>
			</View>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
				<IconButton label="Volume −" icon="remove" disabled={isLoading || isUpdating} onPress={() => updateVolume(Math.max(0, volume - 5))} />
				<View style={{ flex: 1 }}>
					<VolumeSlider
						value={value}
						disabled={isLoading || isUpdating}
						onValueChange={setPreview}
						onCancel={() => setPreview(null)}
						onSlidingComplete={(next) => {
							setPreview(next)
							updateVolume(next, { onSettled: () => setPreview(null) })
						}}
					/>
				</View>
				<IconButton label="Volume +" icon="add" disabled={isLoading || isUpdating} onPress={() => updateVolume(Math.min(100, volume + 5))} />
			</View>
			<Notice message={errorMessage(error)} />
		</View>
	)
}
