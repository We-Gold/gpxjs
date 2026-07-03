import { bench, describe } from 'vitest'

import { parseGPX } from '../lib/index'
import { generateTrackGPX } from './generate-track'

// Runs under the "browser" vitest project, so `parseGPX` exercises the real
// browser DOMParser path rather than a custom parser standing in for it.
// See `parse-node.bench.ts` for the xmldom-qsa path, which has very
// different performance characteristics and is tracked separately so a
// regression in one doesn't hide behind an average with the other.

const POINT_COUNT = 10000
const gpxSource = generateTrackGPX(POINT_COUNT)

describe('parseGPX (browser DOMParser)', () => {
	bench(`parses a ${POINT_COUNT}-point track`, () => {
		const [, error] = parseGPX(gpxSource)
		if (error) throw error
	})
})

describe('toGeoJSON (browser-parsed)', () => {
	const [gpx, error] = parseGPX(gpxSource)
	if (error) throw error

	bench(`converts a ${POINT_COUNT}-point track`, () => {
		gpx.toGeoJSON()
	})
})
