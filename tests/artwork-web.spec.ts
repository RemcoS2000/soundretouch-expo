import { vi } from 'vitest'

import { artworkPixels } from '../src/theme/artworkPixels.web'

type ImageDouble = { src: string; crossOrigin: string; onload: (() => void) | null; onerror: (() => void) | null }
const images: ImageDouble[] = []
const pixels = new Uint8ClampedArray([255, 0, 0, 255])
const context = { drawImage: vi.fn(), getImageData: vi.fn(() => ({ data: pixels })) }
const canvas = { width: 0, height: 0, getContext: vi.fn(() => context) }
const originalImage = Object.getOwnPropertyDescriptor(globalThis, 'Image')
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')

beforeEach(() => {
	images.length = 0
	vi.clearAllMocks()
	canvas.getContext.mockReturnValue(context)
	Object.defineProperty(globalThis, 'Image', {
		configurable: true,
		value: vi.fn(function () {
			const image: ImageDouble = { src: '', crossOrigin: '', onload: null, onerror: null }
			images.push(image)

			return image
		}),
	})
	Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => canvas } })
})

afterEach(() => {
	if (originalImage) {
		Object.defineProperty(globalThis, 'Image', originalImage)
	} else {
		Reflect.deleteProperty(globalThis, 'Image')
	}
	if (originalDocument) {
		Object.defineProperty(globalThis, 'document', originalDocument)
	} else {
		Reflect.deleteProperty(globalThis, 'document')
	}
})

test('samples bounded canvas pixels with CORS and releases image handlers', async () => {
	const result = artworkPixels('https://example.invalid/art.jpg', new AbortController().signal)
	const image = images[0]!
	expect(image.crossOrigin).toBe('anonymous')
	expect(image.src).toBe('https://example.invalid/art.jpg')
	image.onload?.()
	await expect(result).resolves.toBe(pixels)
	expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0, 32, 32)
	expect(context.getImageData).toHaveBeenCalledWith(0, 0, 32, 32)
	expect(image.onload).toBeNull()
	expect(image.onerror).toBeNull()
})

test.each(['before', 'during'])('cancels artwork loading %s image creation completes', async (timing) => {
	const controller = new AbortController()
	if (timing === 'before') {
		controller.abort()
	}
	const result = artworkPixels('art.jpg', controller.signal)
	controller.abort()
	await expect(result).rejects.toThrow('cancelled')
	expect(images[0]?.src).toBe('')
	expect(images[0]?.onload).toBeNull()
})

test('image failures and missing canvas contexts preserve a neutral fallback', async () => {
	const failed = artworkPixels('broken.jpg', new AbortController().signal)
	images[0]?.onerror?.()
	await expect(failed).rejects.toThrow('unavailable')
	canvas.getContext.mockReturnValue(null as unknown as typeof context)
	const unsupported = artworkPixels('art.jpg', new AbortController().signal)
	images[1]?.onload?.()
	await expect(unsupported).rejects.toThrow('unavailable')
})

test('cross-origin canvas exceptions reject and release handlers', async () => {
	context.drawImage.mockImplementationOnce(() => {
		throw new Error('Canvas is tainted')
	})
	const result = artworkPixels('cross-origin.jpg', new AbortController().signal)
	images[0]?.onload?.()
	await expect(result).rejects.toThrow('Canvas is tainted')
	expect(images[0]?.onload).toBeNull()
})
