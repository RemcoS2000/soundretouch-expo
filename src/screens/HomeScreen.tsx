import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useSoundTouchDiscovery } from '../hooks/useSoundTouchDiscovery';
import type { SoundTouchDevice } from '../services/discovery';

export default function HomeScreen() {
	const { devices, loading, refresh } = useSoundTouchDiscovery();

	const renderItem = ({ item }: { item: SoundTouchDevice }) => (
		<TouchableOpacity
			onPress={() => {
				// later: navigate to DeviceDetails screen
				console.log('tap', item);
			}}
			style={{
				backgroundColor: '#fff',
				borderRadius: 10,
				padding: 12,
				marginBottom: 12,
				shadowColor: '#000',
				shadowOpacity: 0.05,
				shadowRadius: 6,
			}}
		>
			<Text style={{ fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
			{item.model ? <Text style={{ color: '#666', marginTop: 4 }}>{item.model}</Text> : null}
			<Text style={{ color: '#888', marginTop: 6 }}>IP: {item.ip}</Text>
		</TouchableOpacity>
	);

	return (
		<View style={{ flex: 1, padding: 20, backgroundColor: '#f3f4f6' }}>
			<Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 6 }}>SoundRetouched</Text>
			<Text style={{ color: '#666', marginBottom: 16 }}>Devices on this network</Text>

			<FlatList
				data={devices}
				keyExtractor={(it) => it.id}
				renderItem={renderItem}
				refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
				ListEmptyComponent={
					!loading ? (
						<View style={{ marginTop: 60, alignItems: 'center' }}>
							<Text style={{ color: '#999' }}>No SoundTouch devices found.</Text>
							<Text style={{ color: '#999', marginTop: 8 }}>Make sure you&apos;re on the same Wi-Fi.</Text>
						</View>
					) : null
				}
			/>
		</View>
	);
}
