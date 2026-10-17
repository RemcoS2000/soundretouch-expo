/**
 * Samples a small image into RGBA pixels, releasing handlers on failure or cancellation.
 * Cross-origin images must permit canvas access; otherwise the neutral accent is retained.
 */
export function artworkPixels(uri: string, signal: AbortSignal): Promise<Uint8ClampedArray> {
	return new Promise((resolve, reject) => {
		const image = new Image()

		image.crossOrigin = 'anonymous'

		/**
		 * Releases image handlers and the abort listener after sampling settles.
		 */
		const cleanup = () => {
			image.onload = null
			image.onerror = null
			signal.removeEventListener('abort', abort)
		}

		/**
		 * Stops loading the image and rejects the cancelled sample.
		 */
		const abort = () => {
			cleanup()
			image.src = ''
			reject(new Error('Artwork sampling was cancelled.'))
		}

		image.onload = () => {
			try {
				const canvas = document.createElement('canvas')

				canvas.width = 32
				canvas.height = 32

				const context = canvas.getContext('2d', { willReadFrequently: true })

				if (!context) {
					throw new Error('Artwork colors are unavailable.')
				}

				context.drawImage(image, 0, 0, 32, 32)
				resolve(context.getImageData(0, 0, 32, 32).data)
			} catch (error) {
				reject(error instanceof Error ? error : new Error('Artwork sampling failed'))
			} finally {
				cleanup()
			}
		}
		image.onerror = () => {
			cleanup()
			reject(new Error('Artwork colors are unavailable.'))
		}

		if (signal.aborted) {
			abort()
		} else {
			signal.addEventListener('abort', abort, { once: true })
			image.src = uri
		}
	})
}
