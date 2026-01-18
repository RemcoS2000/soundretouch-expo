import React, { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AddDeviceManualModal } from '../modals/AddDeviceManualModal';
import { useSoundTouchDevices } from '../state/SoundTouchDevicesContext';

export default function DeviceManagerScreen() {
	const [manualVisible, setManualVisible] = useState(false);
	const router = useRouter();
	const { devices, removeDevice } = useSoundTouchDevices();

	// Normalize device entries for rendering.
	const deviceList = useMemo(
		() =>
			devices.map((entry) => ({
				host: entry.device.host,
				name: entry.info?.name ?? 'SoundTouch device',
			})),
		[devices]
	);

	// Confirm removal; Alert buttons don't work on web.
	const confirmRemove = (host: string, name: string) => {
		if (Platform.OS === 'web') {
			const confirmed = window.confirm(`Remove ${name} from this app?`);
			if (confirmed) {
				removeDevice(host);
			}
			return;
		}
		Alert.alert('Remove speaker?', `Remove ${name} from this app?`, [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Remove', style: 'destructive', onPress: () => removeDevice(host) },
		]);
	};

	return (
		<View style={styles.container}>
			{/* Fixed header; content scrolls beneath. */}
			<View style={styles.headerRow}>
				<Text style={styles.headerTitle}>Devices</Text>
				<TouchableOpacity onPress={() => router.back()}>
					<Text style={styles.closeText}>Close</Text>
				</TouchableOpacity>
			</View>
			{/* Device list and actions. */}
			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{deviceList.length > 0 ? (
					<View style={styles.listCardTop}>
						<Text style={styles.listTitle}>Added devices</Text>
						<Text style={styles.listSubtitle}>Speakers already linked to this app.</Text>
						{deviceList.map((item) => (
							<View key={item.host} style={styles.listRow}>
								<View style={styles.listMain}>
									<View style={styles.deviceIcon}>
										<MaterialIcons name="speaker" size={18} color="#111" />
									</View>
									<View>
										<Text style={styles.listName}>{item.name}</Text>
										<Text style={styles.listHost}>{item.host}</Text>
									</View>
								</View>
								<TouchableOpacity
									onPress={() => confirmRemove(item.host, item.name)}
									accessibilityLabel={`Remove ${item.name}`}
								>
									<MaterialIcons name="close" size={20} color="#666" />
								</TouchableOpacity>
							</View>
						))}
					</View>
				) : (
					<View style={styles.emptyCardTop}>
						<Text style={styles.emptyText}>No devices added yet.</Text>
					</View>
				)}
				<View style={styles.cardSpaced}>
					<Text style={styles.title}>Add a new speaker</Text>
					<Text style={styles.subtitle}>Add a speaker that is already connected to your local network.</Text>
					<TouchableOpacity style={styles.primaryButton} onPress={() => setManualVisible(true)}>
						<Text style={styles.primaryButtonText}>Add device manually</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.cardSpaced}>
					<Text style={styles.title}>Automatic discovery</Text>
					<Text style={styles.subtitle}>Scan your local network to find SoundTouch speakers automatically.</Text>
					<TouchableOpacity style={[styles.primaryButton, styles.disabledButton]} disabled>
						<Text style={styles.disabledButtonText}>Not yet implemented</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.cardSpaced}>
					<Text style={styles.title}>Set up a new speaker</Text>
					<Text style={styles.subtitle}>Connect a speaker that is not yet on your Wi-Fi network.</Text>
					<TouchableOpacity style={[styles.primaryButton, styles.disabledButton]} disabled>
						<Text style={styles.disabledButtonText}>Not yet implemented</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
			<AddDeviceManualModal visible={manualVisible} onClose={() => setManualVisible(false)} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		paddingTop: 60,
		backgroundColor: '#f3f4f6',
	},
	scrollContent: {
		paddingBottom: 30,
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111',
	},
	closeText: {
		color: '#111',
		fontWeight: '600',
	},
	card: {
		backgroundColor: '#fff',
		padding: 20,
		borderRadius: 16,
		boxShadow: '0px 8px 16px rgba(0,0,0,0.08)',
	},
	cardSpaced: {
		marginTop: 24,
		backgroundColor: '#fff',
		padding: 20,
		borderRadius: 16,
		boxShadow: '0px 8px 16px rgba(0,0,0,0.08)',
	},
	listCardTop: {
		backgroundColor: '#fff',
		padding: 20,
		borderRadius: 16,
		boxShadow: '0px 8px 16px rgba(0,0,0,0.08)',
	},
	listTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111',
		marginBottom: 6,
	},
	listSubtitle: {
		color: '#666',
		marginBottom: 12,
	},
	listRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 12,
		backgroundColor: '#f8f9fb',
		borderRadius: 12,
		marginBottom: 10,
	},
	listMain: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	deviceIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	listName: {
		fontSize: 15,
		fontWeight: '600',
		color: '#111',
	},
	listHost: {
		marginTop: 4,
		color: '#666',
	},
	emptyCardTop: {
		padding: 16,
		borderRadius: 16,
		backgroundColor: '#fff',
		boxShadow: '0px 8px 16px rgba(0,0,0,0.08)',
		alignItems: 'center',
	},
	emptyText: {
		color: '#666',
	},
	title: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111',
	},
	subtitle: {
		marginTop: 6,
		marginBottom: 18,
		color: '#666',
	},
	primaryButton: {
		backgroundColor: '#111',
		borderRadius: 12,
		paddingVertical: 12,
		alignItems: 'center',
	},
	disabledButton: {
		backgroundColor: '#d1d5db',
	},
	primaryButtonText: {
		color: '#fff',
		fontWeight: '600',
	},
	disabledButtonText: {
		color: '#777',
		fontWeight: '600',
	},
});
