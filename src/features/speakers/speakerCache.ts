import type { SoundTouchDevice } from '@soundretouch/api/device'
import { QueryClient } from '@tanstack/react-query'

export type Resource = 'info' | 'nowPlaying' | 'zone' | 'volume' | 'sources' | 'presets'

// Derive payloads from the protocol methods so each resource retains its own data contract.
export type ResourceData<R extends Resource = Resource> = Awaited<ReturnType<SoundTouchDevice[R]>>

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			networkMode: 'always',
			retry: (attempt, error) => attempt < 1 && !(error instanceof Error && (error.name === 'AbortError' || /identity|disposed/i.test(error.message))),
			staleTime: 30000,
			gcTime: 300000,
			refetchOnWindowFocus: false,
		},
		mutations: { networkMode: 'always', retry: false },
	},
})

/**
 * Keys cached speaker data by stable identity and resource name.
 */
export const resourceKey = (id: string, resource: Resource) => ['speaker', id, resource] as const
