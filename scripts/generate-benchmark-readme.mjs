// Reads the JSON report produced by `vitest bench --outputJson` and
// rewrites the "Benchmarks" section of the README with a table of the
// results. Keeps the raw report out of the repo (see .gitignore) and
// commits only the human-readable summary, the same way the coverage badge
// script keeps the repo state in sync with the latest run on `main`.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const resultsPath = `${rootDir}bench/results.json`
const readmePath = `${rootDir}README.md`

const START_MARKER = '<!-- BENCHMARKS:START -->'
const END_MARKER = '<!-- BENCHMARKS:END -->'

const report = JSON.parse(readFileSync(resultsPath, 'utf-8'))

// Each benchmark file only runs under one vitest project (see
// vite.config.js), so the filename alone identifies the environment.
function environmentFor(filepath) {
	if (filepath.includes('parse-browser')) return 'Browser (DOMParser)'
	if (filepath.includes('parse-node')) return 'Node (xmldom-qsa)'
	return filepath
}

function formatMs(ms) {
	return ms < 1 ? `${ms.toFixed(3)} ms` : `${ms.toFixed(2)} ms`
}

function formatHz(hz) {
	return hz < 100 ? hz.toFixed(2) : Math.round(hz).toLocaleString()
}

const rows = []
for (const file of report.files) {
	const environment = environmentFor(file.filepath)
	for (const group of file.groups) {
		// The group name is "<file path> > <describe title>", e.g.
		// "parseGPX (browser DOMParser)". The parenthetical repeats what the
		// Environment column already says, so it's dropped here.
		const operation = group.fullName
			.split(' > ')
			.at(-1)
			.replace(/\s*\(.*\)$/, '')
		for (const benchmark of group.benchmarks) {
			rows.push({
				environment,
				operation,
				name: benchmark.name,
				mean: formatMs(benchmark.mean),
				hz: formatHz(benchmark.hz),
				rme: benchmark.rme.toFixed(2),
			})
		}
	}
}

const table = [
	'| Environment | Operation | Mean time | Ops/sec |',
	'| --- | --- | --- | --- |',
	...rows.map(
		(row) =>
			`| ${row.environment} | ${row.operation}: ${row.name} | ${row.mean} | ${row.hz} (±${row.rme}%) |`
	),
].join('\n')

const generatedAt = new Date().toISOString().slice(0, 10)
const section = `${START_MARKER}
_Last updated ${generatedAt} by \`npm run bench:update-readme\`, normally run in CI on push to \`main\`. Shared CI hardware is noisy, so treat these as a rough trend rather than a precise number; run \`npm run bench\` locally to compare branches on the same machine._

${table}
${END_MARKER}`

const readme = readFileSync(readmePath, 'utf-8')
const sectionPattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`)

if (!sectionPattern.test(readme)) {
	throw new Error(
		`Could not find ${START_MARKER} / ${END_MARKER} markers in README.md`
	)
}

writeFileSync(readmePath, readme.replace(sectionPattern, section))

console.log(`Updated benchmark section in README.md with ${rows.length} rows`)
