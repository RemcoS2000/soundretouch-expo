import type { createIdentityGuard, createSessionResources } from './sessionResources'
import { queryClient, type Resource, resourceKey } from './speakerCache'

type CommandContext = {
	id: string
	resources: ReturnType<typeof createSessionResources>
	identity: ReturnType<typeof createIdentityGuard>
	isForeground: () => boolean
}

/** Checks lifecycle and identity again after asynchronous preparation, before sending a command. */
function assertCommandAvailable({ resources, identity, isForeground }: CommandContext) {
	if (resources.disposed || !isForeground()) {
		throw new Error('Speaker controls are unavailable.')
	}
	if (identity.mismatched) {
		throw new Error('Speaker identity changed. Rediscover before using controls.')
	}
}

/** Reconciles uncertain resources before allowing another relative playback command. */
async function prepareCommand(context: CommandContext, uncertain: Set<Resource>, relative: boolean | undefined) {
	const { id, resources, identity } = context

	assertCommandAvailable(context)
	if (!identity.verified) {
		await resources.read('info')
	}
	if (!uncertain.size) {
		return
	}
	await Promise.all(
		[...uncertain].map((resource) =>
			queryClient.fetchQuery({
				queryKey: resourceKey(id, resource),
				queryFn: ({ signal }) => resources.read(resource, signal),
				staleTime: 0,
			})
		)
	)
	uncertain.clear()
	if (relative) {
		throw new Error('Previous command outcome was uncertain. Speaker state has been refreshed; check it and tap again.')
	}
}

/** Serializes commands without retrying mutations or forgetting ambiguous outcomes. */
export function createCommandQueue(context: CommandContext) {
	let queue: Promise<unknown> = Promise.resolve()
	const uncertain = new Set<Resource>()

	return async (action: () => Promise<void>, resources: Resource[] = ['nowPlaying'], options: { relative?: boolean } = {}) => {
		const operation = queue
			.catch(() => undefined)
			.then(async () => {
				await prepareCommand(context, uncertain, options.relative)
				assertCommandAvailable(context)

				try {
					await action()
				} catch (error) {
					resources.forEach((resource) => uncertain.add(resource))

					throw error
				} finally {
					await Promise.all(resources.map(context.resources.refresh))
				}
			})

		queue = operation

		return operation
	}
}
