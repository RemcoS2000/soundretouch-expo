import type { SoundTouchDevice, SourceItem, Sources } from '@soundretouch/api/device'

import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'

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
 * Filters sources that do not need to be displayed in the UI, also filters sources that are not available
 */
const filterSources = (items: SourceItem[]) =>
	items.filter((item) => item.source && !FILTERED_SOURCE_KEYS.includes(item.source) && item.status !== 'UNAVAILABLE')

export const useSources = (device: SoundTouchDevice | null) => {
	const [sourceItems, setSourceItems] = useState<SourceItem[]>([])
	const visibleSourceItems = device ? sourceItems : []

	/**
	 * Exposes a callback to select a source
	 */
	const select = useCallback(
		async (sourceItem: SourceItem) => {
			if (!device || !sourceItem.source) return
			await device.select({ source: sourceItem.source, sourceAccount: String(sourceItem.sourceAccount) })
		},
		[device]
	)

	/**
	 * Loads the initial sources payload, subscribes to updates,
	 * and refreshes on app resume.
	 */
	useEffect(() => {
		if (!device) return

		let cancelled = false
		let unsubscribe = () => {}

		const applySources = (data: Sources | null) => {
			if (cancelled) return
			setSourceItems(filterSources(toSourceItems(data)))
		}

		const subscribe = () => {
			unsubscribe()
			unsubscribe = device.onSourcesUpdated(async () => {
				applySources(await device.sources())
			})
		}

		const load = async () => {
			try {
				applySources(await device.sources())
			} catch {
				applySources(null)
			}
		}

		subscribe()
		void load()

		const appStateSubscription = AppState.addEventListener('change', async (state) => {
			if (state === 'active') {
				// Re-subscribe and refresh when returning from background.
				subscribe()
				await load()
			}
		})

		return () => {
			cancelled = true
			appStateSubscription.remove()
			unsubscribe()
		}
	}, [device])

	return {
		sourceItems: visibleSourceItems,
		select,
	}
}
