import type { SoundTouchDevice } from '@soundretouch/api/device'

import React from 'react'

import { errorMessage, Notice } from '../../design-system/Screen'
import { useSpeakerCommand } from '../speakers/commands'
import { useSpeakerResource } from '../speakers/queries'

import { SheetAction } from './SheetControls'

/**
 * Toggles standby through the speaker command queue and reports uncertain outcomes.
 */
export function PowerControl({ device }: { device: SoundTouchDevice }) {
	const playing = useSpeakerResource(device, 'nowPlaying')
	const mutation = useSpeakerCommand(device, (speaker) => speaker.keyPressAndRelease('POWER'), ['nowPlaying'], { relative: true })

	return (
		<>
			<SheetAction
				icon="power-settings-new"
				label={playing.data?.source === 'STANDBY' ? 'Turn speaker on' : 'Put speaker in standby'}
				pending={mutation.isPending}
				onPress={() => mutation.mutate(undefined)}
			/>
			<Notice message={errorMessage(mutation.error)} />
		</>
	)
}
