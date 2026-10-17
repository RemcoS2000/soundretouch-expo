import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import test from 'node:test'

import { WebSocket, WebSocketServer } from 'ws'

import { createBridge, isLocalAddress, validateTarget } from '../proxy/bridge'

test('bridge rejects public addresses, credential URLs, and non-speaker ports', async () => {
	assert.ok(isLocalAddress('192.168.1.5'))
	assert.ok(isLocalAddress('::1'))
	assert.equal(isLocalAddress('8.8.8.8'), false)
	for (const url of ['http://8.8.8.8:8090/info', 'http://127.0.0.1:22/info', 'http://user:password@127.0.0.1:8090/info', 'https://127.0.0.1:8090/info'])
		await assert.rejects(validateTarget(url))
})
test('forwards HTTP and gabbo updates and rejects disallowed origins', async () => {
	let postedBody = ''
	const speaker = createServer((req, res) => {
		let body = ''

		req.setEncoding('utf8')
		req.on('data', (chunk: string) => {
			body += chunk
		})
		req.on('end', () => {
			if (req.method === 'POST') {
				postedBody = body
			}

			res.setHeader('Content-Type', 'text/xml')
			res.end('<info deviceID="test"/>')
		})
	})
	const updates = new WebSocketServer({ host: '127.0.0.1', port: 8080, handleProtocols: () => 'gabbo' })
	updates.on('connection', (socket) => socket.send('<updates/>'))
	await once(updates, 'listening')
	speaker.listen(8090, '127.0.0.1')
	await once(speaker, 'listening')
	const bridge = createBridge()
	bridge.server.listen(0, '127.0.0.1')
	await once(bridge.server, 'listening')
	const address = bridge.server.address()
	assert.ok(address && typeof address !== 'string')
	const base = `http://127.0.0.1:${address.port}`
	let client: WebSocket | undefined
	try {
		const route = `${base}/proxy?url=${encodeURIComponent('http://127.0.0.1:8090/info')}`
		const response = await fetch(route)
		assert.equal(response.status, 200)
		assert.equal(await response.text(), '<info deviceID="test"/>')
		const xml = '<key state="release" sender="App">PLAY_PAUSE</key>'
		const command = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: xml })
		assert.equal(command.status, 200)
		assert.equal(postedBody, xml)
		assert.equal((await fetch(route, { headers: { Origin: 'https://untrusted.example' } })).status, 403)
		client = new WebSocket(`${base.replace('http:', 'ws:')}/proxy?url=${encodeURIComponent('ws://127.0.0.1:8080')}`, 'gabbo')
		const [payload] = await once(client, 'message')
		assert.equal(payload.toString(), '<updates/>')
		assert.equal(client.protocol, 'gabbo')
	} finally {
		client?.terminate()
		updates.clients.forEach((socket) => socket.terminate())
		updates.close()
		speaker.close()
		bridge.close()
	}
})
