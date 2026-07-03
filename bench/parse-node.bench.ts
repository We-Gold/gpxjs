import { bench, describe } from 'vitest'
import { DOMParser } from 'xmldom-qsa'

import { parseGPXWithCustomParser } from '../lib/index'
import { generateTrackGPX } from './generate-track'

// Runs under the "node" vitest project, exercising the xmldom-qsa custom
// parser path used in non-browser environments (Node, React Native, etc).
// This has very different performance characteristics than the browser
// DOMParser path in `parse-browser.bench.ts`, so it's benchmarked
// separately rather than averaged together.

const POINT_COUNT = 10000
const gpxSource = generateTrackGPX(POINT_COUNT)

const customParseMethod = (txt: string) =>
	new DOMParser().parseFromString(txt, 'text/xml')

describe('parseGPXWithCustomParser (xmldom-qsa)', () => {
	bench(`parses a ${POINT_COUNT}-point track`, () => {
		const [, error] = parseGPXWithCustomParser(gpxSource, customParseMethod)
		if (error) throw error
	})
})

describe('toGeoJSON (xmldom-qsa-parsed)', () => {
	const [gpx, error] = parseGPXWithCustomParser(gpxSource, customParseMethod)
	if (error) throw error

	bench(`converts a ${POINT_COUNT}-point track`, () => {
		gpx.toGeoJSON()
	})
})
