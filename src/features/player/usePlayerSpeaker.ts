import { type SoundTouchDeviceEntry, useSoundTouchDevices } from '../../state/SoundTouchDevicesContext'
import { normalizeId, speakerId } from '../speakers/identity'
import { useSpeakerConnection, useSpeakerResource } from '../speakers/queries'

/** Resolves group playback independently of the selected speaker's local volume target. */
export function usePlayerSpeaker(entry: SoundTouchDeviceEntry) {
	const { devices } = useSoundTouchDevices()
	const info = useSpeakerResource(entry.device, 'info')
	const zone = useSpeakerResource(entry.device, 'zone')
	const connection = useSpeakerConnection(entry.device)
	const masterId = normalizeId(zone.data?.master)
	const master = devices.find((item) => normalizeId(item.info?.deviceID) === masterId)
	const controller = master ?? entry
	const slave = !!masterId && masterId !== speakerId(entry.device.host, entry.info)
	const speakerName = info.data?.name ?? entry.info?.name ?? 'SoundTouch speaker'

	return { info, zone, connection, master, controller, slave, speakerName }
}
