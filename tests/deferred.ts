/** Keeps asynchronous work pending until a test confirms or rejects its outcome. */
export function deferred<T = void>() {
	let resolve!: (value: T | PromiseLike<T>) => void
	let reject!: (error: Error) => void
	const promise = new Promise<T>((confirm, fail) => {
		resolve = confirm
		reject = fail
	})

	return { promise, resolve, reject }
}
