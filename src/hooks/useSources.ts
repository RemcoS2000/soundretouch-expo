import type { SoundTouchDevice, SourceItem } from '@soundretouch/api/device'

import { useSpeakerCommand } from '../features/speakers/commands'
import { useSpeakerResource } from '../features/speakers/queries'

/**
 * Filters selectable sources and sends the chosen source with its optional account identity.
 */
export const useSources = (device: SoundTouchDevice | null) => {
	const query = useSpeakerResource(device, 'sources')
	const raw = query.data?.sourceItem
	const items = Array.isArray(raw) ? raw : [raw].filter((item) => item !== undefined)
	const sourceItems = items.filter(
		(item) => item.source && !['ALEXA', 'AIRPLAY', 'LOCAL_INTERNET_RADIO'].includes(item.source) && item.status !== 'UNAVAILABLE'
	)
	const mutation = useSpeakerCommand(
		device,
		(speaker, item: SourceItem) => {
			if (!item.source) {
				throw new Error('Source unavailable')
			}

			return speaker.select({ source: item.source, ...(item.sourceAccount == null ? {} : { sourceAccount: String(item.sourceAccount) }) })
		},
		['nowPlaying', 'zone']
	)

	return { sourceItems, select: mutation.mutateAsync, mutation, query }
}
