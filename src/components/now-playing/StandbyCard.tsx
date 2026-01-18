import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export function StandbyCard() {
	return (
		<View style={styles.standbyCard}>
			<View style={styles.standbyIcon}>
				<MaterialIcons name="speaker" size={28} color="#999" />
			</View>
			<Text style={styles.standbyTitle}>In standby</Text>
			<Text style={styles.standbySubtitle}>Sleeping speaker · zzz</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	standbyCard: {
		marginTop: 10,
		alignItems: 'center',
		paddingVertical: 16,
		backgroundColor: '#f4f5f7',
		borderRadius: 12,
	},
	standbyIcon: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
	},
	standbyTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#555',
	},
	standbySubtitle: {
		marginTop: 4,
		color: '#888',
	},
});
