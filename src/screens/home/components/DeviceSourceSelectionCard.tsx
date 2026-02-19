import { MaterialIcons } from '@expo/vector-icons'
import type { SoundTouchDevice } from '@soundretouch/api/device'

import React from 'react'
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useNowPlaying } from '../../../hooks/useNowPlaying'
import { useSources } from '../../../hooks/useSources'
import { useAppSettings } from '../../../state/AppSettingsContext'
import { getSourceIconName } from '../../../utils'

type DeviceSourceSelectionCardProps = {
	device: SoundTouchDevice
	onSelected?: () => void
}

export function DeviceSourceSelectionCard({ device, onSelected }: DeviceSourceSelectionCardProps) {
	const { sourceItems, select } = useSources(device)
	const { nowPlaying } = useNowPlaying(device)
	const { colors } = useAppSettings()
	const currentSource = nowPlaying?.source ?? null

	const openSourceApp = async (source?: string) => {
		if (!source) return
		try {
			if (source === 'SPOTIFY') {
				await Linking.openURL('spotify://')
			}
		} catch {
			// Ignore open-app errors for now.
		}
	}

	return (
		<View style={styles.container}>
			<Text style={[styles.title, { color: colors.textMuted }]}>Sources</Text>
			{sourceItems.length > 0 ? (
				<ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
					<View style={styles.list}>
						{sourceItems.map((item, index) => {
							const key = `${item.source ?? 'unknown'}:${item.sourceAccount ?? ''}:${index}`
							const isCurrent = currentSource === item.source
							const canOpenApp = item.source === 'SPOTIFY'
							const label = item.name?.trim() || String(item.sourceAccount ?? item.source ?? '')

							return (
								<TouchableOpacity
									key={key}
									style={[styles.row, { backgroundColor: isCurrent ? colors.surfaceActive : colors.surface }]}
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
									accessibilityLabel={`Select ${label}`}
								>
									<View style={styles.iconWrap}>
										<MaterialIcons name={getSourceIconName(item.source)} size={18} color={colors.icon} />
									</View>
									<View style={styles.rowLabelWrap}>
										<Text style={[styles.rowTitle, { color: colors.text }]}>{label}</Text>
										{item.source ? <Text style={[styles.rowMeta, { color: colors.textMuted }]}>{item.source}</Text> : null}
									</View>
									<View style={styles.rowRightActions}>
										{isCurrent ? <Text style={[styles.currentText, { color: colors.text }]}>Current</Text> : null}
										{canOpenApp ? (
											<TouchableOpacity
												style={styles.appChevronButton}
												accessibilityRole="button"
												accessibilityLabel={`Open ${item.source} app`}
												onPress={(event) => {
													event.stopPropagation()
													void openSourceApp(item.source)
												}}
											>
												<MaterialIcons name="open-in-new" size={16} color={colors.icon} />
											</TouchableOpacity>
										) : null}
									</View>
								</TouchableOpacity>
							)
						})}
					</View>
				</ScrollView>
			) : (
				<Text style={[styles.emptyText, { color: colors.textMuted }]}>No sources available.</Text>
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
	},
	rowMeta: {
		marginTop: 3,
		fontSize: 12,
	},
	currentText: {
		fontSize: 12,
		fontWeight: '700',
	},
	rowRightActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	appChevronButton: {
		width: 24,
		height: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyText: {
		paddingVertical: 8,
		fontSize: 13,
	},
})
