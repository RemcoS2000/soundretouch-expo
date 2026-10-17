import React, { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button, errorMessage, Loading, Notice } from '../design-system/Screen'
import { probeSpeaker } from '../features/speakers/client'
import { useAppSettings } from '../state/AppSettingsContext'
import { type SoundTouchDeviceEntry, useSoundTouchDevices } from '../state/SoundTouchDevicesContext'
import { reportAsync } from '../utils/async'

/**
 * Verifies a manual address before adding or updating a saved speaker.
 */
export function AddDeviceManualModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
	const { addDevice, hydrated } = useSoundTouchDevices()
	const { colors } = useAppSettings()
	const insets = useSafeAreaInsets()
	const [host, setHost] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [result, setResult] = useState<SoundTouchDeviceEntry | null>(null)
	const [previousVisible, setPreviousVisible] = useState(visible)
	const candidate = useRef<SoundTouchDeviceEntry | null>(null)
	const request = useRef<AbortController | null>(null)
	const revision = useRef(0)

	/**
	 * Invalidates pending results and releases any client that has not been added yet.
	 */
	const reset = () => {
		revision.current++
		request.current?.abort()
		request.current = null
		candidate.current?.device.dispose()
		candidate.current = null
	}

	// Reset form state before rendering a newly hidden modal; transport cleanup stays in the effect.
	if (previousVisible !== visible) {
		setPreviousVisible(visible)
		if (!visible) {
			setResult(null)
			setError(null)
			setLoading(false)
			setHost('')
		}
	}

	useEffect(() => reset, [visible])

	/**
	 * Cancels pending verification before dismissing the form.
	 */
	const close = () => {
		reset()
		onClose()
	}

	/**
	 * Verifies the entered address and ignores results from cancelled requests.
	 */
	const submit = async () => {
		reset()

		const generation = revision.current
		const controller = new AbortController()

		request.current = controller
		setLoading(true)
		setError(null)
		setResult(null)

		try {
			const entry = await probeSpeaker(host, controller.signal)

			if (generation !== revision.current) {
				entry.device.dispose()

				return
			}

			candidate.current = entry
			setResult(entry)
		} catch (failure) {
			if (generation === revision.current) {
				setError(errorMessage(failure))
			}
		} finally {
			if (generation === revision.current) {
				setLoading(false)
			}
		}
	}

	return (
		<Modal transparent visible={visible} animationType="slide" onRequestClose={close} accessibilityViewIsModal>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}
			>
				<ScrollView
					keyboardShouldPersistTaps="handled"
					style={{ maxHeight: '85%', flexGrow: 0, backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
					contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}
				>
					<Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>
						Add a speaker
					</Text>
					<Text style={{ color: colors.textMuted, marginVertical: 16, fontSize: 16 }}>
						Enter the IP address or hostname of a SoundTouch speaker on your network.
					</Text>
					<TextInput
						accessibilityLabel="Speaker IP address or hostname"
						placeholder="192.168.1.12 or speaker.local"
						placeholderTextColor={colors.textMuted}
						value={host}
						onChangeText={setHost}
						autoCapitalize="none"
						autoCorrect={false}
						editable={!loading && !result}
						onSubmitEditing={() => {
							if (!loading && host.trim()) {
								reportAsync(submit())
							}
						}}
						style={{
							color: colors.text,
							backgroundColor: colors.surface,
							borderRadius: 12,
							borderColor: colors.border,
							borderWidth: 1,
							padding: 16,
							minHeight: 52,
							fontSize: 16,
						}}
					/>
					{loading && <Loading />}
					<Notice message={error} />
					{result ? (
						<View style={{ marginVertical: 16 }}>
							<Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{result.info?.name}</Text>
							<Text style={{ color: colors.textMuted, marginVertical: 12 }}>
								{result.info?.type} · {result.device.host}
							</Text>
							<Button
								label="Add speaker"
								disabled={!hydrated}
								onPress={() => {
									candidate.current = null
									addDevice(result)
									close()
								}}
							/>
						</View>
					) : (
						<LookupButton
							error={error}
							loading={loading}
							host={host}
							hydrated={hydrated}
							onPress={() => {
								reportAsync(submit())
							}}
						/>
					)}
					<Button label={loading ? 'Cancel lookup' : 'Close'} secondary onPress={close} />
				</ScrollView>
			</KeyboardAvoidingView>
		</Modal>
	)
}

/** Keeps lookup availability and its retry label consistent while verification is pending. */
function LookupButton({
	error,
	loading,
	host,
	hydrated,
	onPress,
}: {
	error: string | null
	loading: boolean
	host: string
	hydrated: boolean
	onPress: () => void
}) {
	const submitLabel = error ? 'Try again' : 'Look for speaker'

	return <Button label={loading ? 'Looking for speaker…' : submitLabel} disabled={loading || !host.trim() || !hydrated} onPress={onPress} />
}
