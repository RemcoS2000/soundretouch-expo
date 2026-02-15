import { type DeviceInfo, SoundTouchDevice } from '@soundretouch/api/device'

import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { useSoundTouchDevices } from '../state/SoundTouchDevicesContext'
import { getSoundtouchProxyUrl } from '../utils/proxy'

interface AddDeviceManualModalProps {
	visible: boolean
	onClose: () => void
}

export function AddDeviceManualModal({ visible, onClose }: AddDeviceManualModalProps) {
	const [host, setHost] = useState('')
	const [state, setState] = useState<'form' | 'loading' | 'success' | 'error'>('form')
	const [info, setInfo] = useState<DeviceInfo | null>(null)
	const [device, setDevice] = useState<SoundTouchDevice | null>(null)
	const canSubmit = host.trim().length > 0
	const { addDevice } = useSoundTouchDevices()

	const handleClose = () => {
		setHost('')
		setInfo(null)
		setDevice(null)
		setState('form')
		onClose()
	}

	const handleSubmit = useCallback(async () => {
		const trimmedHost = host.trim()
		if (!trimmedHost) return
		setState('loading')
		setInfo(null)
		try {
			const proxyUrl = getSoundtouchProxyUrl()
			const instance = new SoundTouchDevice(trimmedHost, {
				http: proxyUrl ? { proxyUrl, timeoutMs: 20000 } : { timeoutMs: 20000 },
			})
			const result = await instance.info()
			setDevice(instance)
			setInfo(result)
			setState('success')
		} catch {
			setState('error')
		}
	}, [host])

	const handleTryAgain = () => {
		setState('form')
		setInfo(null)
		setDevice(null)
	}

	const handleAddSpeaker = () => {
		if (!device) return
		addDevice({ device, info })
		handleClose()
	}

	const renderContent = () => {
		if (state === 'form') {
			return (
				<>
					<Text style={styles.modalTitle}>Add device manually</Text>
					<Text style={styles.modalSubtitle}>Enter the IP address or hostname.</Text>
					<TextInput
						value={host}
						onChangeText={setHost}
						placeholder="192.168.1.12"
						autoCapitalize="none"
						autoCorrect={false}
						keyboardType="numbers-and-punctuation"
						style={styles.input}
					/>
					<TouchableOpacity style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]} onPress={handleSubmit} disabled={!canSubmit}>
						<Text style={styles.primaryButtonText}>Look for device</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.secondaryButton} onPress={handleClose}>
						<Text style={styles.secondaryButtonText}>Close</Text>
					</TouchableOpacity>
				</>
			)
		}

		if (state === 'loading') {
			return (
				<View style={styles.centered}>
					<ActivityIndicator />
					<Text style={styles.statusText}>Looking for a speaker...</Text>
				</View>
			)
		}

		if (state === 'success' && info && device) {
			return (
				<View style={styles.successBody}>
					<Text style={styles.successHeader}>Found speaker</Text>
					<Text style={styles.modalTitle}>{info.name || 'SoundTouch device'}</Text>
					<Text style={styles.modalSubtitle}>{info.type || 'Unknown model'}</Text>
					<View style={styles.infoRow}>
						<Text style={styles.infoLabel}>Host</Text>
						<Text style={styles.infoValue}>{host}</Text>
					</View>
					{info.deviceID && (
						<View style={[styles.infoRow, styles.infoRowLast]}>
							<Text style={styles.infoLabel}>Device ID</Text>
							<Text style={styles.infoValue}>{info.deviceID}</Text>
						</View>
					)}
					<TouchableOpacity style={styles.primaryButton} onPress={handleAddSpeaker}>
						<Text style={styles.primaryButtonText}>Add speaker</Text>
					</TouchableOpacity>
				</View>
			)
		}

		return (
			<View style={styles.centered}>
				<Text style={styles.modalTitle}>No speaker found</Text>
				<Text style={[styles.statusText, styles.errorSpacing]}>We could not reach {host}.</Text>
				<TouchableOpacity style={[styles.primaryButton, styles.fullWidthButton]} onPress={handleSubmit}>
					<Text style={styles.primaryButtonText}>Try again</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.secondaryButton} onPress={handleTryAgain}>
					<Text style={styles.secondaryButtonText}>Edit IP</Text>
				</TouchableOpacity>
			</View>
		)
	}

	return (
		<Modal animationType="slide" transparent visible={visible} onRequestClose={handleClose}>
			<View style={styles.overlay}>
				<View style={styles.modalCard}>{renderContent()}</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'flex-end',
	},
	modalCard: {
		backgroundColor: '#fff',
		padding: 20,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111',
	},
	modalSubtitle: {
		marginTop: 6,
		marginBottom: 18,
		color: '#666',
	},
	infoRow: {
		marginTop: 12,
	},
	infoLabel: {
		fontSize: 12,
		color: '#666',
	},
	infoValue: {
		marginTop: 2,
		color: '#111',
	},
	infoRowLast: {
		marginBottom: 12,
	},
	successBody: {
		paddingBottom: 8,
	},
	successHeader: {
		fontSize: 12,
		fontWeight: '600',
		letterSpacing: 0.5,
		color: '#666',
		textTransform: 'uppercase',
		marginBottom: 8,
	},
	centered: {
		alignItems: 'center',
	},
	statusText: {
		marginTop: 10,
		color: '#666',
		textAlign: 'center',
	},
	errorSpacing: {
		marginBottom: 12,
	},
	input: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 12,
	},
	primaryButton: {
		backgroundColor: '#111',
		borderRadius: 12,
		paddingVertical: 12,
		alignItems: 'center',
	},
	fullWidthButton: {
		alignSelf: 'stretch',
	},
	primaryButtonDisabled: {
		opacity: 0.6,
	},
	primaryButtonText: {
		color: '#fff',
		fontWeight: '600',
	},
	secondaryButton: {
		marginTop: 10,
		paddingVertical: 10,
		alignItems: 'center',
	},
	secondaryButtonText: {
		color: '#444',
	},
})
