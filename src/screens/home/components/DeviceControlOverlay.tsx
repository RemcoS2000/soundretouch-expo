import React, { useCallback, useMemo, useState } from 'react';
import { Animated, PanResponder, ScrollView, StyleSheet, View } from 'react-native';
import type { SoundTouchDevice } from '@soundretouch/api/device';
import { ZoneControlCard } from './ZoneControlCard';
import { DeviceSummaryCard } from './DeviceSummaryCard';

type DeviceControlOverlayProps = {
	device: SoundTouchDevice | null;
	footerHeight: number;
	screenHeight: number;
	expandedTopOffset: number;
};

const OVERLAY_ANIMATION_MS = 280;

export function DeviceControlOverlay({ device, footerHeight, screenHeight, expandedTopOffset }: DeviceControlOverlayProps) {
	// Overlay controls are only enabled when a device is selected.
	const enabled = Boolean(device);

	// `isExpanded` drives footer expanded/collapsed label state.
	// `isVisible` keeps the overlay surface mounted while animating closed.
	const [isExpanded, setIsExpanded] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const [overlayHeight, setOverlayHeight] = useState(0);

	// Shared animated progress:
	// 0 => closed, 1 => fully expanded.
	const [progress] = useState(() => new Animated.Value(0));

	const open = useCallback(() => {
		if (!enabled) return;
		setIsExpanded(true);
		setIsVisible(true);
		Animated.timing(progress, {
			toValue: 1,
			duration: OVERLAY_ANIMATION_MS,
			useNativeDriver: true,
		}).start();
	}, [enabled, progress]);

	// Swipe-down and footer toggle both collapse via the same animation.
	const close = useCallback(() => {
		setIsExpanded(false);
		Animated.timing(progress, {
			toValue: 0,
			duration: OVERLAY_ANIMATION_MS,
			useNativeDriver: true,
		}).start(({ finished }) => {
			if (finished) {
				setIsVisible(false);
			}
		});
	}, [progress]);

	// Footer press toggles overlay state.
	const toggle = useCallback(() => {
		if (!enabled) return;
		if (isExpanded) {
			close();
			return;
		}
		open();
	}, [enabled, isExpanded, open, close]);

	// Slide the whole overlay panel from bottom to top.
	const translateY = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [screenHeight, 0],
	});

	// Top bar drag gesture to dismiss when pulling down.
	const swipeResponder = useMemo(
		() =>
			PanResponder.create({
				onMoveShouldSetPanResponder: (_, gestureState) =>
					gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
				onPanResponderRelease: (_, gestureState) => {
					if (gestureState.dy > 60) {
						close();
					}
				},
			}),
		[close]
	);

	// No device selected means no footer and no settings content.
	if (!device) return null;

	// Footer needs to travel up as overlay expands, so it ends near the top.
	const footerTravel = Math.max(0, overlayHeight - footerHeight - expandedTopOffset);
	const footerTranslateY = translateY.interpolate({
		inputRange: [0, screenHeight],
		outputRange: [-footerTravel, 0],
		extrapolate: 'clamp',
	});

	return (
		<View
			pointerEvents="box-none"
			style={styles.root}
			onLayout={(event) => {
				setOverlayHeight(event.nativeEvent.layout.height);
			}}
		>
			{/* Always-visible summary/footer card. */}
			<Animated.View style={[styles.footerContainer, { transform: [{ translateY: footerTranslateY }] }]}>
				<DeviceSummaryCard activeDevice={device} isExpanded={isExpanded} onPress={toggle} />
			</Animated.View>

			{/* Expandable settings surface. */}
			{isVisible && (
				<Animated.View style={[styles.overlay, { transform: [{ translateY }] }]}>
					<View style={styles.topBar} {...swipeResponder.panHandlers}>
						<View style={styles.topHandle} />
					</View>
					<ScrollView
						contentContainerStyle={[styles.content, { paddingTop: footerHeight + 12, paddingBottom: footerHeight + 24 }]}
						showsVerticalScrollIndicator={false}
					>
						<ZoneControlCard device={device} />
					</ScrollView>
				</Animated.View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		...StyleSheet.absoluteFillObject,
		zIndex: 20,
		justifyContent: 'flex-end',
	},
	overlay: {
		...StyleSheet.absoluteFillObject,
		zIndex: 10,
		backgroundColor: '#fff',
	},
	footerContainer: {
		zIndex: 20,
	},
	content: {
		paddingHorizontal: 20,
		gap: 12,
	},
	topBar: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 10,
		paddingBottom: 6,
	},
	topHandle: {
		width: 48,
		height: 5,
		borderRadius: 999,
		backgroundColor: '#d1d5db',
	},
});
