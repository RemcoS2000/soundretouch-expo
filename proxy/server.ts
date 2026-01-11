import 'dotenv/config';
import express from 'express';

/**
 * Dev-only proxy server for Expo Web.
 *
 * Provides a generic /proxy endpoint to forward requests and a /soundtouch/discover
 * endpoint to scan a subnet server-side when browser limits would otherwise block discovery.
 */
const DEV_PROXY_PORT = Number(process.env.DEV_PROXY_PORT || 4100);
const DEV_PROXY_DISCOVERY_TIMEOUT_MS = Number(process.env.DEV_PROXY_DISCOVERY_TIMEOUT_MS) || 10000;
const DEV_PROXY_DISCOVERY_PORT = Number(process.env.DEV_PROXY_DISCOVERY_PORT) || 8090;

// Print configuration
console.log(`⚙️ Proxy configuration:
	DEV_PROXY_PORT: ${DEV_PROXY_PORT}
	DEV_PROXY_DISCOVERY_TIMEOUT_MS: ${DEV_PROXY_DISCOVERY_TIMEOUT_MS}
	DEV_PROXY_DISCOVERY_PORT: ${DEV_PROXY_DISCOVERY_PORT}
`);

const app = express();

const applyCorsHeaders = (req: express.Request, res: express.Response): void => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
	res.setHeader(
		'Access-Control-Allow-Headers',
		typeof req.headers['access-control-request-headers'] === 'string' ? req.headers['access-control-request-headers'] : 'Content-Type'
	);
};

app.use((req, res, next) => {
	applyCorsHeaders(req, res);
	if (req.method === 'OPTIONS') {
		res.status(204).send();
		return;
	}
	next();
});

/**
 * /proxy forwards any method to the target URL specified in the query string.
 */
app.all('/proxy', async (req, res) => {
	const target = typeof req.query.url === 'string' ? req.query.url : undefined;
	console.log('📡 Proxy request received', target);

	if (!target) {
		res.status(400).type('text').send('Missing url parameter');
		return;
	}

	try {
		const method = req.method || 'GET';
		const headers = req.headers as Record<string, string | string[]>;
		const body = method === 'GET' || method === 'HEAD' ? undefined : req;

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), DEV_PROXY_DISCOVERY_TIMEOUT_MS);
		res.on('close', () => controller.abort());

		const proxyRes = await fetch(target, {
			method,
			headers,
			body,
			signal: controller.signal,
			duplex: body ? 'half' : undefined,
		} as RequestInit);

		clearTimeout(timeout);

		proxyRes.headers.forEach((value, key) => {
			const lowerKey = key.toLowerCase();
			if (lowerKey.startsWith('access-control-')) return;
			res.setHeader(key, value);
		});

		res.status(proxyRes.status);
		if (proxyRes.body) {
			const reader = proxyRes.body.getReader();
			res.on('close', () => reader.cancel().catch(() => undefined));

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				if (value) res.write(Buffer.from(value));
			}
			res.end();
			return;
		}

		res.end();
	} catch (err) {
		if (err instanceof Error && err.name === 'AbortError') {
			res.status(504).type('text').send('Upstream timeout');
			return;
		}
		res.status(502)
			.type('text')
			.send(err instanceof Error ? err.message : 'Proxy error');
	}
});

/**
 * /soundtouch/discover scans a subnet server-side and returns devices that respond to /info.
 */
app.get('/soundtouch/discover', async (req, res) => {
	const subnet = typeof req.query.subnet === 'string' ? req.query.subnet : undefined;
	const port = Number(typeof req.query.port === 'string' ? req.query.port : DEV_PROXY_DISCOVERY_PORT);
	const rangeStart = Number(typeof req.query.rangeStart === 'string' ? req.query.rangeStart : '');
	const rangeEnd = Number(typeof req.query.rangeEnd === 'string' ? req.query.rangeEnd : '');

	if (!subnet) {
		res.status(400).type('text').send('Missing subnet parameter');
		return;
	}

	if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd)) {
		res.status(400).type('text').send('Missing rangeStart or rangeEnd parameter');
		return;
	}

	console.log(`🔍 Discovery request: subnet=${subnet} port=${port} range=${rangeStart}-${rangeEnd}`);

	const ips: string[] = [];
	for (let i = rangeStart; i <= rangeEnd; i += 1) {
		ips.push(`${subnet}.${i}`);
	}

	const results: { ip: string; infoXml: string }[] = [];

	await Promise.all(
		ips.map(async (ip) => {
			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), DEV_PROXY_DISCOVERY_TIMEOUT_MS);
				const response = await fetch(`http://${ip}:${port}/info`, { signal: controller.signal });
				clearTimeout(timeout);

				if (!response.ok) return;
				const text = await response.text();
				results.push({ ip, infoXml: text });
			} catch {
				// Ignore unreachable IPs or timeouts
			}
		})
	);

	console.log(`✅ Discovery complete: ${results.length} device(s) found`);

	res.status(200).json({ subnet, port, devices: results });
});

app.listen(DEV_PROXY_PORT, () => {
	console.log(`✅ SoundTouch proxy listening on http://localhost:${DEV_PROXY_PORT}`);
});
