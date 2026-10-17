import MaterialIcons from '@expo/vector-icons/MaterialIcons'

import { useRouter } from 'expo-router'
import React from 'react'
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppSettings } from '../state/AppSettingsContext'
import { tokens } from '../theme/tokens'

/**
 * Provides a themed, safe-area-aware scroll surface for secondary screens.
 */
export function Screen({
	title,
	subtitle,
	children,
	action,
	background,
	back = false,
}: {
	title: string
	subtitle?: string
	children: React.ReactNode
	action?: React.ReactNode
	background?: React.ReactNode
	back?: boolean
}) {
	const { colors } = useAppSettings()
	const insets = useSafeAreaInsets()

	return (
		<View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
			{background}
			<PageHeader title={title} action={action} back={back} />
			<ScrollView
				contentContainerStyle={{
					paddingBottom: insets.bottom + tokens.space.lg,
					paddingHorizontal: tokens.layout.gutter,
					width: '100%',
					maxWidth: tokens.layout.contentWidth,
					alignSelf: 'center',
				}}
				keyboardShouldPersistTaps="handled"
			>
				{subtitle && <Text style={{ color: colors.textMuted, fontSize: tokens.type.body, marginBottom: 16 }}>{subtitle}</Text>}
				{children}
			</ScrollView>
		</View>
	)
}

/**
 * Aligns secondary-screen titles and actions with the Now Playing header.
 * The minimum height allows larger accessibility text to grow without clipping.
 */
export function PageHeader({ title, action, back = false }: { title: string; action?: React.ReactNode; back?: boolean }) {
	const { colors } = useAppSettings()

	return (
		<View
			style={{
				minHeight: tokens.layout.headerHeight,
				maxWidth: tokens.layout.contentWidth,
				width: '100%',
				alignSelf: 'center',
				paddingHorizontal: tokens.layout.gutter,
				paddingVertical: tokens.layout.gutter,
				flexDirection: 'row',
				alignItems: 'center',
				gap: 8,
			}}
		>
			{back && <BackButton />}
			<Text accessibilityRole="header" style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '600' }}>
				{title}
			</Text>
			{action}
		</View>
	)
}

/**
 * Returns to the previous screen, falling back to Now Playing for direct links.
 */
export function BackButton() {
	const router = useRouter()
	const { colors } = useAppSettings()

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel="Back"
			onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
			style={({ pressed }) => ({
				width: tokens.touchTarget,
				height: tokens.touchTarget,
				alignItems: 'center',
				justifyContent: 'center',
				opacity: pressed ? 0.6 : 1,
			})}
		>
			<MaterialIcons name={Platform.OS === 'ios' ? 'chevron-left' : 'arrow-back'} size={28} color={colors.text} />
		</Pressable>
	)
}

/**
 * Renders an accessible text action with consistent sizing and selected and disabled states.
 */
export function Button({
	label,
	onPress,
	disabled,
	secondary = false,
	selected,
}: {
	label: string
	onPress: () => void
	disabled?: boolean
	secondary?: boolean
	selected?: boolean
}) {
	const { colors } = useAppSettings()
	const background = secondary ? colors.surfaceActive : colors.accent
	const foreground = secondary ? colors.text : colors.onAccent

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled: !!disabled, selected }}
			aria-selected={selected}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => ({
				minHeight: tokens.touchTarget,
				paddingHorizontal: 18,
				paddingVertical: 12,
				borderRadius: 14,
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: selected ? colors.accentSurface : background,
				borderWidth: selected ? 2 : 0,
				borderColor: colors.accent,
				opacity: interactionOpacity(!!disabled, pressed),
				marginVertical: 4,
			})}
		>
			<Text
				style={{
					color: selected ? colors.onAccentSurface : foreground,
					fontSize: 15,
					fontWeight: '600',
					textAlign: 'center',
					maxWidth: '100%',
					flexShrink: 1,
				}}
			>
				{label}
			</Text>
		</Pressable>
	)
}

/**
 * Groups related controls on a themed surface.
 */
export function Card({ children }: { children: React.ReactNode }) {
	const { colors } = useAppSettings()

	return (
		<View
			style={{
				padding: 20,
				borderRadius: tokens.radius.md,
				backgroundColor: colors.surfaceElevated,
				borderWidth: 1,
				borderColor: colors.border,
				marginBottom: 16,
				gap: 12,
			}}
		>
			{children}
		</View>
	)
}

/**
 * Shows feedback with an optional retry action and announces updates to screen readers.
 */
export function Notice({ message, retry }: { message?: string | null | undefined; retry?: () => void }) {
	const { colors } = useAppSettings()

	if (!message) {
		return null
	}

	return (
		<View
			accessibilityLiveRegion="polite"
			style={{ padding: 16, backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginVertical: 12 }}
		>
			<Text style={{ color: colors.text, fontSize: 15 }}>{message}</Text>
			{retry && <Button label="Retry" onPress={retry} secondary />}
		</View>
	)
}

/**
 * Shows the shared loading indicator with a screen-reader label.
 */
export function Loading() {
	const { colors } = useAppSettings()

	return <ActivityIndicator accessibilityLabel="Loading speaker data" color={colors.text} style={{ margin: 24 }} />
}

/**
 * Converts request failures into user-facing feedback without exposing developer connection details.
 */
export const errorMessage = (error: unknown) => {
	if (!(error instanceof Error)) {
		return error ? 'Speaker request failed. Check your connection and retry.' : null
	}

	if (error.name === 'TimeoutError') {
		return 'Speaker did not respond in time. Check its connection and retry.'
	}

	if (/proxy|bridge|npm run|https?:\/\/|wss?:\/\//i.test(error.message)) {
		return 'Unable to reach the speaker. Check your local network and try again.'
	}

	if (error.name === 'HttpError' && /502|504/.test(error.message)) {
		return 'Speaker is unavailable. Check the local network and retry.'
	}

	if (Platform.OS === 'web' && error instanceof TypeError) {
		return 'Unable to reach the speaker. Check your connection and try again.'
	}

	return error.message
}

/**
 * Renders a labelled icon action with a minimum 48-pixel interaction target.
 */
export function IconButton({
	label,
	icon,
	onPress,
	disabled,
	loading = false,
	prominent = false,
	selected,
}: {
	label: string
	icon: React.ComponentProps<typeof MaterialIcons>['name']
	onPress: () => void
	disabled?: boolean
	loading?: boolean
	prominent?: boolean
	selected?: boolean
}) {
	const { colors } = useAppSettings()

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled: !!disabled, selected, busy: loading }}
			aria-selected={selected}
			aria-busy={loading}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => ({
				width: prominent ? 64 : 48,
				height: prominent ? 64 : 48,
				borderRadius: 36,
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: prominent || selected ? colors.accent : colors.surfaceActive,
				opacity: interactionOpacity(!!disabled && !loading, pressed),
			})}
		>
			{loading ? (
				<ActivityIndicator size={prominent ? 'large' : 'small'} color={prominent || selected ? colors.onAccent : colors.text} />
			) : (
				<MaterialIcons name={icon} size={prominent ? 36 : 28} color={prominent || selected ? colors.onAccent : colors.text} />
			)}
		</Pressable>
	)
}

/**
 * Dismisses a secondary screen, falling back to the player for direct links.
 */
export function DismissButton() {
	const router = useRouter()

	return <Button label="Done" secondary onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
}

/**
 * Keeps disabled and pressed feedback consistent across text and icon actions.
 */
function interactionOpacity(disabled: boolean, pressed: boolean): number {
	if (disabled) {
		return 0.5
	}

	return pressed ? 0.75 : 1
}
