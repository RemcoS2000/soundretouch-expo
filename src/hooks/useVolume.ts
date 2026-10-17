import type { SoundTouchDevice } from '@soundretouch/api/device'
import { useMutation } from '@tanstack/react-query'

import { setSpeakerVolume } from '../features/speakers/commands'
import { useSpeakerResource } from '../features/speakers/queries'

/**
 * Exposes live volume and clamped updates through the coalescing command queue.
 */
export const useVolume = (device: SoundTouchDevice | null) => {
	const query = useSpeakerResource(device, 'volume')

	const mutation = useMutation({
		mutationFn: (value: number) => {
			if (!device) {
				throw new Error('No speaker selected')
			}

			return setSpeakerVolume(device, Math.max(0, Math.min(100, Math.round(value))))
		},
	})

	return {
		volume: query.data?.actualvolume ?? query.data?.targetvolume ?? 0,
		muteEnabled: query.data?.muteenabled ?? false,
		isLoading: query.isLoading,
		isUpdating: mutation.isPending,
		setVolume: mutation.mutateAsync,
		updateVolume: mutation.mutate,
		error: mutation.error ?? query.error,
		query,
	}
}
