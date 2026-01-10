import React, { useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Text, ListRenderItem } from 'react-native';

import { useSoundTouchDiscovery } from '../hooks/useSoundTouchDiscovery';
import { useSoundTouchPolling } from '../hooks/useSoundTouchPolling';
import type { SoundTouchDevice } from '../services/discovery';
import { SoundtouchDeviceItem } from '../components/SoundtouchDeviceItem';
import { EmptyDeviceList } from '../components/EmptyDeviceList';
import { Header } from '../components/Header';

export default function HomeScreen() {
	const { devices, loading, refresh, setDevices } = useSoundTouchDiscovery();
	useSoundTouchPolling(devices, setDevices);

	const handleDevicePress = useCallback((item: SoundTouchDevice) => {
		console.log('tap', item);
	}, []);

	const renderItem: ListRenderItem<SoundTouchDevice> = useCallback(
		({ item }) => <SoundtouchDeviceItem item={item} onPress={handleDevicePress} />,
		[handleDevicePress]
	);

	const emptyComponent = useMemo(() => (!loading ? <EmptyDeviceList /> : null), [loading]);

	return (
		<View style={styles.container}>
			<Header loading={loading} onRefresh={refresh} />
			<Text style={styles.subtitle}>Devices on this network</Text>

			<FlatList
				data={devices}
				keyExtractor={(item) => item.id}
				renderItem={renderItem}
				contentContainerStyle={devices.length === 0 ? styles.emptyList : undefined}
				ListEmptyComponent={emptyComponent}
			/>
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
	subtitle: {
		color: '#666',
		marginBottom: 16,
	},
	emptyList: {
		flexGrow: 1,
		justifyContent: 'center',
	},
});
