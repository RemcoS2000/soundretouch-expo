import React, { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList, ListRenderItem, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSoundTouchDevices } from '../state/SoundTouchDevicesContext';
import { NowPlayingCard } from '../components/NowPlayingCard';

export default function HomeScreen() {
	const router = useRouter();
	const { devices } = useSoundTouchDevices();
	const deviceCountLabel = useMemo(() => (devices.length === 1 ? '1 device added' : `${devices.length} devices added`), [devices.length]);
	const windowWidth = useMemo(() => Dimensions.get('window').width, []);
	const cardWidth = useMemo(() => windowWidth, [windowWidth]);

	const renderItem: ListRenderItem<(typeof devices)[number]> = ({ item }) => (
		<View style={{ width: cardWidth }}>
			<View style={styles.carouselItem}>
				<NowPlayingCard device={item.device} />
			</View>
		</View>
	);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>SoundReTouch</Text>
				<TouchableOpacity
					onPress={() => router.push('/device-manager')}
					accessibilityRole="button"
					accessibilityLabel="Manage devices"
				>
					<View style={styles.iconWrap}>
						<MaterialIcons name="speaker-group" size={24} color="black" />
						<MaterialIcons name="add-circle" size={14} color="#111" style={styles.iconBadge} />
					</View>
				</TouchableOpacity>
			</View>
			<View style={styles.carouselWrap}>
				{devices.length > 0 ? (
					<FlatList
						data={devices}
						horizontal
						pagingEnabled
						showsHorizontalScrollIndicator={false}
						keyExtractor={(item) => item.device.host}
						renderItem={renderItem}
						snapToInterval={cardWidth}
						decelerationRate="fast"
						contentContainerStyle={styles.carouselContainer}
					/>
				) : (
					<View style={styles.emptyCard}>
						<Text style={styles.emptyTitle}>No speakers yet</Text>
						<Text style={styles.emptySubtitle}>Add a device to see now playing info.</Text>
					</View>
				)}
			</View>
			<Text style={styles.placeholderMeta}>{deviceCountLabel}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 60,
		paddingBottom: 20,
		backgroundColor: '#f3f4f6',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		marginBottom: 16,
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
	},
	iconWrap: {
		width: 26,
		height: 26,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconBadge: {
		position: 'absolute',
		right: -2,
		bottom: -2,
		backgroundColor: '#fff',
		borderRadius: 8,
	},
	sectionLabel: {
		marginTop: 12,
		marginBottom: 10,
		color: '#111',
		fontSize: 16,
		fontWeight: '700',
	},
	carouselWrap: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	carouselContainer: {
		paddingBottom: 6,
		paddingHorizontal: 0,
	},
	carouselItem: {
		paddingHorizontal: 20,
	},
	emptyCard: {
		marginTop: 16,
		marginHorizontal: 20,
		padding: 18,
		borderRadius: 18,
		backgroundColor: '#fff',
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 8,
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#111',
	},
	emptySubtitle: {
		marginTop: 6,
		color: '#666',
	},
	placeholderMeta: {
		marginTop: 8,
		paddingHorizontal: 20,
		color: '#999',
		fontSize: 12,
	},
});
