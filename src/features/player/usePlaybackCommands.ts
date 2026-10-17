import type { SoundTouchDevice, SoundTouchKey } from '@soundretouch/api/device'

import { useSpeakerCommand } from '../speakers/commands'

/** Keeps seek and transport mutations mounted while the displayed source changes. */
export function usePlaybackCommands(device: SoundTouchDevice) {
	const keys = useSpeakerCommand(device, (speaker, key: SoundTouchKey) => speaker.keyPressAndRelease(key), ['nowPlaying'], { relative: true })
	const seek = useSpeakerCommand(device, (speaker, seconds: number) => speaker.setUserTrackControl('SEEK_TO_TIME', seconds))

	return { keys, seek }
}

export type PlaybackCommand = ReturnType<typeof usePlaybackCommands>['keys']
export type SeekCommand = ReturnType<typeof usePlaybackCommands>['seek']
