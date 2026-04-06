import type { SoundTouchDevice, SourceItem, Sources } from '@soundretouch/api/device'

import { useCallback } from 'react'

import { useSoundTouchDevice } from './useSoundTouchDevice'

/**
 * Normalizes the source payload to a consistent array shape.
 */
const toSourceItems = (sources: Sources | null): SourceItem[] => {
	const raw = sources?.sourceItem
	if (!raw) return []
	return Array.isArray(raw) ? raw : [raw]
}

const FILTERED_SOURCE_KEYS = ['ALEXA', 'AIRPLAY', 'LOCAL_INTERNET_RADIO']
/**
 * Filters sources that do not need to be displayed in the UI, also filters sources that are not available.
 */
const filterSources = (items: SourceItem[]) =>
	items.filter((item) => item.source && !FILTERED_SOURCE_KEYS.includes(item.source) && item.status !== 'UNAVAILABLE')

export const useSources = (device: SoundTouchDevice | null) => {
	/**
	 * Exposes the filtered source list and source selection action.
	 */
	const { sources } = useSoundTouchDevice(device)
	const sourceItems = filterSources(toSourceItems(sources))
	const select = useCallback(
		async (sourceItem: SourceItem) => {
			if (!device || !sourceItem.source) return
			await device.select({ source: sourceItem.source, sourceAccount: String(sourceItem.sourceAccount) })
		},
		[device]
	)

	return {
		sourceItems,
		select,
	}
}
