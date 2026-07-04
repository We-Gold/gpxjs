import { describe, expect, test } from 'vitest'
import { DOMParser } from 'xmldom-qsa'
import { parseGPX, parseGPXWithCustomParser } from '../lib/index'
import type { Options } from '../lib/types'

import {
	emptyGPXFile,
	invalidXMLInput,
	missingLatLonGPXFile,
	noTimeNoElevationGPXFile,
	zeroPointsGPXFile,
} from './edge-case-fixtures'

const nonBrowserParse = (gpxSource: string, options?: Options) =>
	parseGPXWithCustomParser(
		gpxSource,
		(txt) => new DOMParser().parseFromString(txt, 'text/xml'),
		options
	)

// Run every edge case against both the browser DOMParser and the
// xmldom-qsa parser used in Node/React Native, so a regression in either
// runtime's code path gets caught.
const parsers = [
	{ name: 'browser', parse: parseGPX },
	{ name: 'non-browser (xmldom-qsa)', parse: nonBrowserParse },
]

describe.each(parsers)('parseGPX edge cases ($name)', ({ parse }) => {
	test.each([
		['an empty document', emptyGPXFile],
		['invalid XML', invalidXMLInput],
	])('%s falls back to empty defaults without throwing', (_label, gpxSource) => {
		const [parsed, error] = parse(gpxSource)
		if (error) throw error

		expect(parsed.metadata).toStrictEqual({
			name: '',
			description: '',
			keywords: '',
			link: [],
		})
		expect(parsed.waypoints).toStrictEqual([])
		expect(parsed.tracks).toStrictEqual([])
		expect(parsed.routes).toStrictEqual([])
	})

	test('a waypoint missing lat/lon parses to NaN coordinates rather than throwing', () => {
		const [parsed, error] = parse(missingLatLonGPXFile)
		if (error) throw error

		expect(parsed.waypoints[0]).toStrictEqual({
			name: 'No Coordinates',
			latitude: NaN,
			longitude: NaN,
			link: [],
		})
	})

	test('a waypoint with no time or elevation omits those fields', () => {
		const [parsed, error] = parse(noTimeNoElevationGPXFile)
		if (error) throw error

		expect(parsed.waypoints[0]).toStrictEqual({
			name: 'No Time Or Elevation',
			latitude: 47.253146555709,
			longitude: -1.5153741828293,
			link: [],
		})
	})

	test('a track and route with zero points produce empty stats instead of throwing', () => {
		const [parsed, error] = parse(zeroPointsGPXFile)
		if (error) throw error

		const emptyStats = {
			points: [],
			distance: { cumulative: [0], total: 0 },
			duration: { cumulative: [0], movingDuration: 0, totalDuration: 0 },
			elevation: {},
			slopes: [],
			link: [],
		}

		expect(parsed.tracks[0]).toStrictEqual({
			name: 'Empty Track',
			...emptyStats,
		})
		expect(parsed.routes[0]).toStrictEqual({
			name: 'Empty Route',
			...emptyStats,
		})
	})
})
