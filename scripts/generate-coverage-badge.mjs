// Reads the coverage summary produced by `npm run coverage` and writes a
// shields.io "endpoint" badge JSON file describing the line coverage
// percentage. The README points a badge at the raw GitHub URL of the output
// file, so it stays a simple JSON file in the repo rather than depending on
// a third-party coverage service.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const summaryPath = `${rootDir}coverage/coverage-summary.json`
const badgePath = `${rootDir}badges/coverage.json`

const summary = JSON.parse(readFileSync(summaryPath, 'utf-8'))
const percentage = summary.total.lines.pct

function colorForCoverage(pct) {
	if (pct >= 90) return 'brightgreen'
	if (pct >= 80) return 'green'
	if (pct >= 70) return 'yellowgreen'
	if (pct >= 50) return 'yellow'
	if (pct >= 30) return 'orange'
	return 'red'
}

const badge = {
	schemaVersion: 1,
	label: 'coverage',
	message: `${percentage}%`,
	color: colorForCoverage(percentage),
}

writeFileSync(badgePath, `${JSON.stringify(badge)}\n`)

console.log(`Wrote coverage badge: ${badge.message} (${badge.color})`)
