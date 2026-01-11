import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface HeaderProps {
	loading: boolean;
	onRefresh: () => void;
}

// The header of the home screen, containing the title and a refresh button.
export function Header({ loading, onRefresh }: HeaderProps) {
	return (
		<View style={styles.header}>
			<Text style={styles.title}>SoundReTouch</Text>
			{loading ? (
				<ActivityIndicator />
			) : (
				<TouchableOpacity onPress={onRefresh}>
					<MaterialIcons name="refresh" size={24} color="black" />
				</TouchableOpacity>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 6,
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
	},
});
