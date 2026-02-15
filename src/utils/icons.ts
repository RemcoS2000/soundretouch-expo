/**
 * Maps known source keys to MaterialIcons names used in source and preset tiles.
 */
export const getSourceIconName = (source?: string) => {
	switch (source?.toUpperCase()) {
		case 'AUX':
			return 'headset'
		case 'SPOTIFY':
			return 'music-note'
		case 'TUNEIN':
			return 'radio'
		case 'LOCAL_INTERNET_RADIO':
			return 'language'
		case 'BLUETOOTH':
			return 'bluetooth'
		default:
			return 'audiotrack'
	}
}
