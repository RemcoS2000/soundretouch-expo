import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, relative, resolve } from 'node:path'

/** Extracts numerical scores from ESLint's cyclomatic and SonarJS cognitive diagnostics. */
function complexityScores(results, directory) {
	const cyclomatic = []
	const cognitive = []

	for (const result of results) {
		for (const message of result.messages) {
			let pattern

			if (message.ruleId === 'complexity') {
				pattern = /complexity of (\d+)/
			} else if (message.ruleId === 'sonarjs/cognitive-complexity') {
				pattern = /from (\d+) to/
			} else {
				continue
			}

			const match = message.message.match(pattern)

			assert.ok(match, `Unrecognized complexity diagnostic: ${message.message}`)
			const score = { file: relative(directory, result.filePath), line: message.line, value: Number(match[1]) }

			if (message.ruleId === 'complexity') {
				cyclomatic.push(score)
			} else {
				cognitive.push(score)
			}
		}
	}

	assert.ok(cyclomatic.length, 'No functions were measured; check the source paths and ESLint rules.')

	return { cyclomatic, cognitive }
}

/** Includes zero-complexity functions when averaging cognitive scores across the source scan. */
function summarize(scores, functionCount) {
	const values = scores.map((score) => score.value)
	const total = values.reduce((sum, value) => sum + value, 0)

	return {
		total,
		average: Number((total / functionCount).toFixed(2)),
		maximum: Math.max(0, ...values),
		highest: [...scores].sort((left, right) => right.value - left.value).slice(0, 10),
	}
}

const directory = resolve(process.argv[2] ?? '.')
const require = createRequire(join(directory, 'package.json'))
const { ESLint } = require('eslint')
// Zero thresholds emit measurements for every function. The repository's lint configuration
// stays unchanged; this reporting command does not replace npm run lint or verification.
const eslint = new ESLint({
	cwd: directory,
	overrideConfig: [{ files: ['src/**/*.{ts,tsx}'], rules: { complexity: ['warn', 0], 'sonarjs/cognitive-complexity': ['warn', 0] } }],
})
const results = await eslint.lintFiles([join(directory, 'src')])
const { cyclomatic, cognitive } = complexityScores(results, directory)
const report = {
	files: results.length,
	functions: cyclomatic.length,
	cyclomatic: summarize(cyclomatic, cyclomatic.length),
	cognitive: summarize(cognitive, cyclomatic.length),
}
const output = join(directory, 'reports', 'complexity.json')

await mkdir(join(directory, 'reports'), { recursive: true })
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
console.log(`Complexity measurements saved to ${output}`)
