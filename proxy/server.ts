import { config } from 'dotenv'

import { createBridge } from './bridge'

config({ path: ['.env.local', '.env'] })

const port = Number(process.env.DEV_PROXY_PORT || 4100)
const allowedOrigins: unknown = process.env.DEV_PROXY_ALLOWED_ORIGINS
const bridge = createBridge({
	timeoutMs: Number(process.env.DEV_PROXY_DISCOVERY_TIMEOUT_MS || 8000),
	...(typeof allowedOrigins === 'string' ? { origins: allowedOrigins.split(',') } : {}),
})

bridge.server.listen(port, '127.0.0.1', () => console.log(`Local SoundTouch companion: http://localhost:${port}`))

process.once('SIGINT', bridge.close)

process.once('SIGTERM', bridge.close)
