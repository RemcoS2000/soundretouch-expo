import React, { useCallback } from 'react';
import { View, StyleSheet, Text, FlatList, ListRenderItem, useWindowDimensions } from 'react-native';
import type { SoundTouchDeviceEntry } from '../../../state/SoundTouchDevicesContext';
import { NowPlayingCard } from './NowPlayingCard';

type ScrollEvent = { nativeEvent: { contentOffset: { x: number } } };

type DeviceCarouselProps = {
	/** Ordered list of devices that become horizontal pages in the carousel. */
	devices: SoundTouchDeviceEntry[];
	/** Reserved bottom spacing (px), typically matching the collapsed bottom-sheet height (+ breathing room). */
	footerHeight: number;
	/** Called whenever the nearest visible page index changes after/while scrolling. Receives a bounded index. */
	onActiveIndexChange: (index: number) => void;
};

export function DeviceCarousel({ devices, footerHeight, onActiveIndexChange }: DeviceCarouselProps) {
	// Each carousel page fills the viewport width.
	const { width: pageWidth } = useWindowDimensions();

	// Render one full-width page containing a single NowPlaying card.
	const renderItem: ListRenderItem<SoundTouchDeviceEntry> = ({ item }) => (
		<View style={[styles.page, { width: pageWidth }]}>
			<NowPlayingCard device={item.device} />
		</View>
	);

	// Translate horizontal offset into a stable page index within valid bounds.
	const updateActiveIndexFromOffset = useCallback(
		(offsetX: number) => {
			if (devices.length === 0) {
				onActiveIndexChange(0);
				return;
			}
			const nextIndex = Math.round(offsetX / pageWidth);
			const boundedIndex = Math.max(0, Math.min(devices.length - 1, nextIndex));
			onActiveIndexChange(boundedIndex);
		},
		[devices.length, pageWidth, onActiveIndexChange]
	);

	// We listen to multiple scroll end events for cross-platform consistency.
	const handleMomentumScrollEnd = useCallback(
		(event: ScrollEvent) => updateActiveIndexFromOffset(event.nativeEvent.contentOffset.x),
		[updateActiveIndexFromOffset]
	);

	const handleScrollEndDrag = useCallback(
		(event: ScrollEvent) => updateActiveIndexFromOffset(event.nativeEvent.contentOffset.x),
		[updateActiveIndexFromOffset]
	);

	const handleScroll = useCallback(
		(event: ScrollEvent) => updateActiveIndexFromOffset(event.nativeEvent.contentOffset.x),
		[updateActiveIndexFromOffset]
	);

	// Empty-state card shown when there are no linked speakers yet.
	if (devices.length === 0) {
		return (
			<View style={styles.emptyCard}>
				<Text style={styles.emptyTitle}>No speakers yet</Text>
				<Text style={styles.emptySubtitle}>Add a device to see now playing info.</Text>
			</View>
		);
	}

	return (
		<FlatList
			data={devices}
			horizontal
			scrollEnabled={devices.length > 1}
			pagingEnabled
			showsHorizontalScrollIndicator={false}
			bounces={false}
			alwaysBounceHorizontal={false}
			overScrollMode="never"
			directionalLockEnabled
			keyExtractor={(item) => item.device.host}
			renderItem={renderItem}
			snapToInterval={pageWidth}
			decelerationRate="fast"
			style={styles.list}
			contentContainerStyle={[styles.carouselContainer, { paddingBottom: footerHeight + 10 }]}
			onMomentumScrollEnd={handleMomentumScrollEnd}
			onScrollEndDrag={handleScrollEndDrag}
			onScroll={handleScroll}
			scrollEventThrottle={16}
		/>
	);
}

const styles = StyleSheet.create({
	list: {
		flex: 1,
		width: '100%',
	},
	carouselContainer: {
		paddingHorizontal: 0,
	},
	page: {
		flex: 1,
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
