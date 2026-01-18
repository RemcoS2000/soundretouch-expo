import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList, ListRenderItem, useWindowDimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSoundTouchDevices } from '../state/SoundTouchDevicesContext';
import { useColorTint } from '../hooks/useColorTint';
import { NowPlayingCard } from '../components/now-playing/NowPlayingCard';
import { ZoneControlCard } from '../components/now-playing/ZoneControlCard';

export default function HomeScreen() {
	const router = useRouter();
	const { devices } = useSoundTouchDevices();
	const [activeIndex, setActiveIndex] = useState(0);
	const activeDevice = devices[activeIndex]?.device ?? null;
	const { lightTint } = useColorTint(activeDevice);
	const backgroundTint = lightTint ?? '#f3f4f6';
	const { width: cardWidth } = useWindowDimensions();

	const renderItem: ListRenderItem<(typeof devices)[number]> = ({ item }) => (
		<View style={{ width: cardWidth }}>
			<ScrollView contentContainerStyle={styles.carouselItem} showsVerticalScrollIndicator={false}>
				<NowPlayingCard device={item.device} />
				<ZoneControlCard device={item.device} />
			</ScrollView>
		</View>
	);

	const handleScroll = useCallback(
		(event: { nativeEvent: { contentOffset: { x: number } } }) => {
			const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
			setActiveIndex((prev) => (prev === nextIndex ? prev : Math.max(0, Math.min(devices.length - 1, nextIndex))));
		},
		[cardWidth, devices.length]
	);

	return (
		<LinearGradient colors={['#fff', backgroundTint]} style={styles.container}>
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
						onScroll={handleScroll}
						scrollEventThrottle={16}
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
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 60,
		paddingBottom: 20,
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
		boxShadow: '0px 8px 16px rgba(0,0,0,0.08)',
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
});
