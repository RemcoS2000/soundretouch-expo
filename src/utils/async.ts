import { log } from './logger'

/**
 * Reports failures from intentionally detached work without hiding rejected promises.
 * Query and command owners remain responsible for displaying their own error state.
 */
export function reportAsync(work: Promise<unknown>, message = 'Background operation failed'): void {
	work.catch((error: unknown) => log.warn(message, error))
}
