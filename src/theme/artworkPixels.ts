import { decode } from 'blurhash'
import { Image } from 'expo-image'

/**
 * Uses Expo Image's existing native decoder to sample broad artwork colors.
 * Cancellation releases the caller even if the native decoder is still finishing its work.
 */
export function artworkPixels(uri: string, signal: AbortSignal): Promise<Uint8ClampedArray> {
	return new Promise((resolve, reject) => {
		/**
		 * Releases the caller immediately when native artwork sampling is cancelled.
		 */
		const abort = () => {
			signal.removeEventListener('abort', abort)
			reject(new Error('Artwork sampling was cancelled.'))
		}

		if (signal.aborted) {
			abort()

			return
		}

		signal.addEventListener('abort', abort, { once: true })

		/**
		 * Loads cached artwork when available and decodes its broad color sample.
		 */
		const sample = async () => {
			const cached = await Image.getCachePathAsync(uri)
			const cachedUri = cached?.startsWith('file:') ? cached : `file://${cached}`
			const source = cached ? cachedUri : uri

			if (signal.aborted) {
				throw new Error('Artwork sampling was cancelled.')
			}

			// BlurHash preserves broad image colors without another native dependency.
			const hash = await Image.generateBlurhashAsync(source, [4, 4])

			if (!hash || signal.aborted) {
				throw new Error('Artwork colors are unavailable.')
			}

			return decode(hash, 32, 32)
		}

		void sample().then(
			(pixels) => {
				signal.removeEventListener('abort', abort)
				resolve(pixels)
			},
			(error) => {
				signal.removeEventListener('abort', abort)
				reject(error instanceof Error ? error : new Error('Artwork sampling failed'))
			}
		)
	})
}
