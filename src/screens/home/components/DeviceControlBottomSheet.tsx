import React from 'react';
import { useWindowDimensions } from 'react-native';
import type { SoundTouchDevice } from '@soundretouch/api/device';
import { BottomSheet } from '../../../components/BottomSheet';
import { DeviceSummaryCard } from './DeviceSummaryCard';
import { ZoneControlCard } from './ZoneControlCard';

const FOOTER_HEIGHT = 84;

type DeviceControlBottomSheetProps = {
	/** Active device for this sheet. When `null`, the component renders nothing. */
	device: SoundTouchDevice | null;
	/** Expanded top offset (px). Smaller values expand closer to the top. */
	expandedTopOffset: number;
};

export function DeviceControlBottomSheet({ device, expandedTopOffset }: DeviceControlBottomSheetProps) {
	// BottomSheet requires a concrete container height to calculate open/closed offsets.
	const { height: screenHeight } = useWindowDimensions();

	// Keep home screen clean when no active speaker exists.
	if (!device) return null;

	return (
		<BottomSheet
			footerHeight={FOOTER_HEIGHT}
			screenHeight={screenHeight}
			expandedTopOffset={expandedTopOffset}
			renderSummary={({ isExpanded, toggle }) => <DeviceSummaryCard device={device} isExpanded={isExpanded} onPress={toggle} />}
		>
			<ZoneControlCard device={device} />
		</BottomSheet>
	);
}
