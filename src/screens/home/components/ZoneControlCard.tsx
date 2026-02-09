import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { SoundTouchDevice } from '@soundretouch/api/device';
import { useSoundTouchDevices } from '../../../state/SoundTouchDevicesContext';

type ZoneControlCardProps = {
	/** Base device whose zone/group we are managing. */
	device: SoundTouchDevice;
};

export function ZoneControlCard({ device }: ZoneControlCardProps) {
	const { devices } = useSoundTouchDevices();
	const availableDevices = useMemo(
		() =>
			devices
				.filter((entry) => entry.device.host !== device.host)
				.map((entry) => ({
					host: entry.device.host,
					name: entry.info?.name ?? 'SoundTouch device',
				})),
		[devices, device.host]
	);

	// TODO: Call SoundTouch zone API to add/remove speakers once available.
	return (
		<View style={styles.card}>
			<View style={styles.header}>
				<View style={styles.headerRow}>
					<MaterialIcons name="speaker-group" size={18} color="#111" />
					<View>
						<Text style={styles.title}>Zone control</Text>
						<Text style={styles.subtitle}>Add a speaker to this group.</Text>
					</View>
				</View>
			</View>
			{availableDevices.length > 0 ? (
				<View style={styles.list}>
					{availableDevices.map((item) => (
						<View key={item.host} style={styles.listRow}>
							<View>
								<Text style={styles.listName}>{item.name}</Text>
							</View>
							<TouchableOpacity
								style={styles.addButton}
								accessibilityLabel={`Add ${item.name} to zone`}
								onPress={() => {
									// TODO: Call zone add endpoint for item.host
								}}
							>
								<MaterialIcons name="add" size={18} color="#fff" />
							</TouchableOpacity>
						</View>
					))}
				</View>
			) : (
				<Text style={styles.helperText}>No other speakers available.</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		marginTop: 12,
		padding: 16,
		borderRadius: 16,
		backgroundColor: '#fff',
		boxShadow: '0px 6px 16px rgba(0,0,0,0.08)',
	},
	header: {
		marginBottom: 12,
	},
	title: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	subtitle: {
		marginTop: 4,
		color: '#666',
	},
	list: {
		gap: 10,
	},
	listRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#f8f9fb',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	listName: {
		fontSize: 14,
		fontWeight: '600',
		color: '#111',
	},
	listSubtitle: {
		marginTop: 4,
		color: '#777',
		fontSize: 12,
	},
	addButton: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#111',
		alignItems: 'center',
		justifyContent: 'center',
	},
	helperText: {
		marginTop: 10,
		color: '#888',
		fontSize: 12,
	},
});
