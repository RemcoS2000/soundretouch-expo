import { vi } from 'vitest'

// Font assets and glyph rendering are native boundaries, not assertions about application behavior.
vi.mock('@expo/vector-icons/MaterialIcons', async () => {
	const React = await import('react')
	const { Text } = await import('react-native')

	return { default: (props: { name: string }) => React.createElement(Text, { accessible: false }, props.name) }
})

vi.mock('expo-router', async () => {
	const { useEffect } = await import('react')
	const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), canGoBack: vi.fn(() => false), setParams: vi.fn() }
	const navigation = { addListener: vi.fn(() => vi.fn()) }

	return {
		useRouter: () => router,
		useNavigation: () => navigation,
		useIsFocused: vi.fn(() => true),
		useLocalSearchParams: () => ({}),
		useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
	}
})

// Operating-system boundaries stay deterministic; React Native itself uses the adapter's native engine.
vi.mock('expo-font', () => ({ isLoaded: () => true, isLoading: () => false, loadAsync: vi.fn(async () => {}) }))
vi.mock('expo-network', () => ({
	addNetworkStateListener: vi.fn(() => ({ remove: vi.fn() })),
	getNetworkStateAsync: vi.fn(async () => ({ isConnected: true })),
}))

vi.mock('expo-image', async () => {
	const React = await import('react')
	const { View } = await import('react-native')

	return {
		Image: Object.assign((props: object) => React.createElement(View, props), {
			getCachePathAsync: vi.fn(async () => null),
			generateBlurhashAsync: vi.fn(async () => ''),
		}),
	}
})
