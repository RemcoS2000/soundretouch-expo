import { lookup } from 'node:dns/promises'
import { createServer } from 'node:http'
import { isIP } from 'node:net'
import { resolve } from 'node:path'

import express from 'express'
import { WebSocket, WebSocketServer } from 'ws'

/**
 * Checks whether an address belongs to loopback, a private network or a link-local range.
 */
export function isLocalAddress(value: string): boolean {
	const host = value.replace(/^\[|\]$/g, '').toLowerCase()

	if (isIP(host) === 4) {
		const [a = -1, b = -1] = host.split('.').map(Number)

		return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254)
	}

	return isIP(host) === 6 && (host === '::1' || /^f[cd]/.test(host) || /^fe[89ab]/.test(host))
}

/**
 * Validates a local speaker target and pins its resolved address before forwarding a request.
 */
export async function validateTarget(raw: string, websocket = false): Promise<URL> {
	const url = new URL(raw)

	if (url.username || url.password || url.hash || url.protocol !== (websocket ? 'ws:' : 'http:') || url.port !== (websocket ? '8080' : '8090')) {
		throw new Error('Only local speaker HTTP:8090 and WebSocket:8080 targets are allowed.')
	}

	const hostname = url.hostname.replace(/^\[|\]$/g, '')
	const answers = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true })

	const [firstAnswer] = answers

	if (!firstAnswer || answers.some((answer) => !isLocalAddress(answer.address))) {
		throw new Error('Target must resolve exclusively to local network addresses.')
	}

	// Pin the validated address so DNS cannot change between validation and connection.
	const address = firstAnswer.address

	url.hostname = address.includes(':') ? `[${address}]` : address

	return url
}

/**
 * Creates the local development HTTP and WebSocket bridge with restricted targets and origins.
 */
export function createBridge({
	timeoutMs = 8000,
	origins = ['http://localhost:8081', 'http://127.0.0.1:8081'],
	staticDir = resolve('dist'),
}: { timeoutMs?: number; origins?: string[]; staticDir?: string } = {}) {
	const app = express()
	const server = createServer(app)
	const sockets = new WebSocketServer({ noServer: true, handleProtocols: (protocols) => (protocols.has('gabbo') ? 'gabbo' : false) })

	/**
	 * Restricts bridge access to loopback hosts and explicitly allowed origins.
	 */
	const allowed = (origin: string | undefined, host: string | undefined) =>
		!!host && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) && (!origin || origin === `http://${host}` || origins.includes(origin))

	app.use((req, res, next) => {
		const origin = req.headers.origin

		if (!allowed(origin, req.headers.host)) {
			res.status(403).send('Origin is not allowed')

			return
		}

		if (origin) {
			res.setHeader('Access-Control-Allow-Origin', origin)
			res.setHeader('Vary', 'Origin')
		}

		res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

		if (req.method === 'OPTIONS') {
			res.sendStatus(204)

			return
		}

		next()
	})
	app.get('/health', (_req, res) => res.json({ status: 'ok' }))
	app.all('/proxy', express.raw({ type: '*/*', limit: '256kb' }), async (req, res) => {
		if (!['GET', 'POST'].includes(req.method)) {
			res.sendStatus(405)

			return
		}

		if (typeof req.query.url !== 'string') {
			res.status(400).send('Missing url')

			return
		}

		let target: URL

		try {
			target = await validateTarget(req.query.url)
		} catch {
			res.status(400).send('Invalid local speaker target')

			return
		}

		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), timeoutMs)

		/**
		 * Cancels the upstream HTTP request when the client connection closes.
		 */
		const abort = () => {
			if (!res.writableEnded) {
				controller.abort()
			}
		}

		res.on('close', abort)

		try {
			const requestBody: unknown = req.body
			const xmlBody = Buffer.isBuffer(requestBody) ? requestBody.toString('utf8') : undefined

			const upstream = await fetch(target, {
				method: req.method,
				headers: { 'Content-Type': 'text/xml' },
				...(req.method === 'POST' && xmlBody !== undefined ? { body: xmlBody } : {}),
				signal: controller.signal,
				redirect: 'manual',
			})

			if (upstream.status >= 300 && upstream.status < 400) {
				res.status(502).send('Speaker redirects are not supported')

				return
			}

			const body = await upstream.text()

			res.status(upstream.status).type('text/xml').send(body)
		} catch {
			if (!res.destroyed) {
				res.status(controller.signal.aborted ? 504 : 502).send('Speaker unavailable or timed out')
			}
		} finally {
			clearTimeout(timer)
			res.off('close', abort)
		}
	})
	app.use(express.static(staticDir, { dotfiles: 'deny' }))
	app.get('/{*path}', (_req, res) => res.sendFile(resolve(staticDir, 'index.html')))
	server.on('upgrade', (req, socket, head) => {
		void (async () => {
			if (!allowed(req.headers.origin, req.headers.host)) {
				throw new Error('Origin not allowed')
			}

			const request = new URL(req.url ?? '/', 'http://localhost')

			if (
				request.pathname !== '/proxy' ||
				!request.searchParams.get('url') ||
				!req.headers['sec-websocket-protocol']
					?.split(',')
					.map((value) => value.trim())
					.includes('gabbo')
			) {
				throw new Error('Invalid socket request')
			}

			const target = await validateTarget(request.searchParams.get('url')!, true)

			if (socket.destroyed) {
				return
			}

			sockets.handleUpgrade(req, socket, head, (downstream) => {
				const upstream = new WebSocket(target, 'gabbo', { handshakeTimeout: timeoutMs, maxPayload: 1024 * 1024 })

				/**
				 * Releases both WebSocket connections and their shared timeout.
				 */
				const cleanup = () => {
					if (upstream.readyState === WebSocket.CONNECTING) {
						upstream.terminate()
					} else {
						upstream.close()
					}

					downstream.close()
				}

				upstream.on('message', (data, binary) => {
					if (downstream.readyState === WebSocket.OPEN) {
						downstream.send(data, { binary })
					}
				})
				downstream.on('message', (data, binary) => {
					if (upstream.readyState === WebSocket.OPEN) {
						upstream.send(data, { binary })
					}
				})
				upstream.on('error', cleanup)
				downstream.on('error', cleanup)
				upstream.on('close', () => downstream.close())
				downstream.on('close', () => {
					if (upstream.readyState === WebSocket.CONNECTING) {
						upstream.terminate()
					} else {
						upstream.close()
					}
				})
			})
		})().catch(() => socket.destroy())
	})

	return {
		server,
		close: () => {
			sockets.clients.forEach((socket) => socket.terminate())
			sockets.close()
			server.close()
		},
	}
}
