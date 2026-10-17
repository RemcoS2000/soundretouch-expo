import { argbFromHex, blueFromArgb, Contrast, greenFromArgb, Hct, redFromArgb } from '@material/material-color-utilities'

import { encode } from 'blurhash'
import { Image } from 'expo-image'
import { vi } from 'vitest'

import { sourceColorFromPixels, withArtworkAccent } from '../src/theme/artwork'
import { artworkPixels } from '../src/theme/artworkPixels'
import { darkColors, lightColors } from '../src/theme/colors'

/**
 * Creates small solid-color artwork samples to exercise palette selection.
 */
function sample(red: number, green: number, blue: number, alpha = 255) {
	return new Uint8ClampedArray(Array.from({ length: 32 * 32 }, () => [red, green, blue, alpha]).flat())
}

test('selects image colors and ignores transparent or monochrome artwork', () => {
	const red = sourceColorFromPixels(sample(220, 30, 40))!
	const blue = sourceColorFromPixels(sample(30, 50, 220))!

	expect(redFromArgb(red)).toBeGreaterThan(blueFromArgb(red))
	expect(blueFromArgb(blue)).toBeGreaterThan(redFromArgb(blue))
	expect(greenFromArgb(red)).toBeLessThan(redFromArgb(red))
	expect(sourceColorFromPixels(sample(220, 30, 40, 0))).toBeNull()
	expect(sourceColorFromPixels(sample(128, 128, 128))).toBeNull()
})

test('maintains readable accent pairs and neutral text in both appearance modes', () => {
	for (const source of [0xffff0000, 0xff00ff00, 0xff0000ff, 0xffffff00, 0xffff00ff]) {
		for (const dark of [false, true]) {
			const base = dark ? darkColors : lightColors
			const colors = withArtworkAccent(base, source, dark)
			const tone = (color: string) => Hct.fromInt(argbFromHex(color)).tone

			expect(Contrast.ratioOfTones(tone(colors.accent), tone(colors.onAccent))).toBeGreaterThanOrEqual(4.5)
			expect(Contrast.ratioOfTones(tone(colors.accentSurface), tone(colors.onAccentSurface))).toBeGreaterThanOrEqual(4.5)
			expect(Contrast.ratioOfTones(tone(colors.accent), tone(colors.surfaceElevated))).toBeGreaterThanOrEqual(3)
			expect(colors.text).toBe(base.text)
			expect(colors.background).toBe(base.background)
		}
	}

	expect(withArtworkAccent(lightColors, null, false)).toBe(lightColors)
})

test('samples native artwork through the existing Expo Image module and respects cancellation', async () => {
	const bytes = sample(220, 30, 40)
	vi.spyOn(Image, 'getCachePathAsync').mockResolvedValue('/cached-artwork.jpg')
	const generate = vi.spyOn(Image, 'generateBlurhashAsync').mockResolvedValue(encode(bytes, 32, 32, 4, 4))

	try {
		const result = await artworkPixels('https://example.com/art.jpg', new AbortController().signal)
		expect(generate).toHaveBeenCalledWith('file:///cached-artwork.jpg', [4, 4])
		expect(redFromArgb(sourceColorFromPixels(result)!)).toBeGreaterThan(200)

		const cancelled = new AbortController()
		cancelled.abort()
		await expect(artworkPixels('https://example.com/art.jpg', cancelled.signal)).rejects.toThrow('cancelled')
		expect(generate).toHaveBeenCalledTimes(1)
	} finally {
		vi.restoreAllMocks()
	}
})

test('cancels an in-flight native sample without waiting for the decoder', async () => {
	let finish!: (hash: string) => void
	vi.spyOn(Image, 'getCachePathAsync').mockResolvedValue(null)
	const generate = vi.spyOn(Image, 'generateBlurhashAsync').mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve
			})
	)
	const controller = new AbortController()

	try {
		const pending = artworkPixels('https://example.com/art.jpg', controller.signal)
		await Promise.resolve()
		expect(generate).toHaveBeenCalledTimes(1)
		controller.abort()
		await expect(pending).rejects.toThrow('cancelled')
		finish(encode(sample(220, 30, 40), 32, 32, 4, 4))
	} finally {
		vi.restoreAllMocks()
	}
})
