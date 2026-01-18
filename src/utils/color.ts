const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const toRgbString = (r: number, g: number, b: number) => `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
const lightenChannel = (channel: number) => Math.round(channel * 0.4 + 255 * 0.6);

const getHashedRgb = (artUrl: string) => {
	let hash = 0;
	for (let i = 0; i < artUrl.length; i += 1) {
		hash = (hash << 5) - hash + artUrl.charCodeAt(i);
		hash |= 0;
	}
	return {
		r: (hash >> 16) & 0xff,
		g: (hash >> 8) & 0xff,
		b: hash & 0xff,
	};
};

/**
 * Returns a light rgb(...) tint derived from an artwork URL.
 */
export const getLightTintFromArt = (artUrl?: string): string | null => {
	if (!artUrl) return null;
	const { r, g, b } = getHashedRgb(artUrl);
	return toRgbString(lightenChannel(r), lightenChannel(g), lightenChannel(b));
};

/**
 * Returns a darker rgb(...) tint derived from an artwork URL.
 */
export const getDarkTintFromArt = (artUrl?: string): string | null => {
	if (!artUrl) return null;
	const { r, g, b } = getHashedRgb(artUrl);
	return toRgbString(r * 0.6, g * 0.6, b * 0.6);
};
