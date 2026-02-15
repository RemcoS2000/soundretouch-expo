import { MaterialIcons } from '@expo/vector-icons'
import type { SoundTouchDevice } from '@soundretouch/api/device'

import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useNowPlaying } from '../../../hooks/useNowPlaying'
import { useSources } from '../../../hooks/useSources'
import { getSourceIconName } from '../../../utils'

type DeviceSourceSelectionCardProps = {
	device: SoundTouchDevice
	onSelected?: () => void
}

export function DeviceSourceSelectionCard({ device, onSelected }: DeviceSourceSelectionCardProps) {
	const { sourceItems, select } = useSources(device)
	const { nowPlaying } = useNowPlaying(device)
	const currentSource = nowPlaying?.source ?? null

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Sources</Text>
			{sourceItems.length > 0 ? (
				<ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
					<View style={styles.list}>
						{sourceItems.map((item, index) => {
							const key = `${item.source ?? 'unknown'}:${item.sourceAccount ?? ''}:${index}`
							const isCurrent = currentSource === item.source

							return (
								<TouchableOpacity
									key={key}
									style={[styles.row, isCurrent ? styles.rowCurrent : null]}
									onPress={() => {
										if (isCurrent) return
										if (!item.source) return
										void (async () => {
											await select(item)
											onSelected?.()
										})()
									}}
									disabled={!item.source || isCurrent}
									accessibilityRole="button"
									accessibilityLabel={`Select ${item['#text']?.trim() || item.sourceAccount || item.source || ''}`}
								>
									<View style={styles.iconWrap}>
										<MaterialIcons name={getSourceIconName(item.source)} size={18} color="#111" />
									</View>
									<View style={styles.rowLabelWrap}>
										<Text style={styles.rowTitle}>{item['#text']?.trim() || item.sourceAccount || item.source || ''}</Text>
										{item.source ? <Text style={styles.rowMeta}>{item.source}</Text> : null}
									</View>
									{isCurrent ? <Text style={styles.currentText}>Current</Text> : null}
								</TouchableOpacity>
							)
						})}
					</View>
				</ScrollView>
			) : (
				<Text style={styles.emptyText}>No sources available.</Text>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		borderRadius: 12,
		paddingHorizontal: 5,
	},
	title: {
		marginBottom: 8,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
		color: '#666',
	},
	list: {
		gap: 8,
	},
	listScroll: {
		flex: 1,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		gap: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 12,
		backgroundColor: '#f3f4f6',
	},
	rowCurrent: {
		backgroundColor: '#e8eaef',
	},
	iconWrap: {
		width: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	rowLabelWrap: {
		flex: 1,
	},
	rowTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#111',
	},
	rowMeta: {
		marginTop: 3,
		fontSize: 12,
		color: '#666',
	},
	currentText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#111',
	},
	emptyText: {
		paddingVertical: 8,
		fontSize: 13,
		color: '#666',
	},
})
