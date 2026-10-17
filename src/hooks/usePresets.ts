import type { PresetId, SoundTouchDevice } from '@soundretouch/api/device'

import { useSpeakerCommand } from '../features/speakers/commands'
import { useSpeakerResource } from '../features/speakers/queries'

/**
 * Exposes cached presets and their selection mutation.
 */
export const usePresets = (device: SoundTouchDevice | null) => {
	const query = useSpeakerResource(device, 'presets')
	const mutation = useSpeakerCommand(device, (speaker, id: PresetId) => speaker.keyPressAndRelease(`PRESET_${id}`))

	return { presets: query.data ?? [], selectPreset: mutation.mutateAsync, mutation, query }
}
