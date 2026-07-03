import { expect, test } from 'vitest'
import { parseGPX } from '../lib/index'

import {
	noTimeNoElevationGPXFile,
	timedTrackGPXFile,
} from './edge-case-fixtures'
import { testGPXFile } from './test-gpx-file'

test('removeEmptyFields: false keeps null fields in the parsed output', () => {
	const [withDefaults, defaultsError] = parseGPX(noTimeNoElevationGPXFile)
	if (defaultsError) throw defaultsError

	// By default, fields with no value are stripped from the output.
	expect(withDefaults.waypoints[0]).toStrictEqual({
		name: 'No Time Or Elevation',
		latitude: 47.253146555709,
		longitude: -1.5153741828293,
		link: [],
	})

	const [withNulls, nullsError] = parseGPX(noTimeNoElevationGPXFile, {
		removeEmptyFields: false,
		avgSpeedThreshold: 0.000215,
	})
	if (nullsError) throw nullsError

	// With the option off, the same fields are present but null.
	expect(withNulls.waypoints[0]).toStrictEqual({
		name: 'No Time Or Elevation',
		symbol: null,
		latitude: 47.253146555709,
		longitude: -1.5153741828293,
		elevation: null,
		comment: null,
		description: null,
		time: null,
		magneticVariation: null,
		geoidHeight: null,
		src: null,
		link: [],
		type: null,
		fix: null,
		satellites: null,
		hdop: null,
		vdop: null,
		pdop: null,
		ageOfDgpsData: null,
		dgpsId: null,
		extensions: null,
	})
})

test('removeEmptyFields does not affect fields that already have a value', () => {
	const [parsedGPX, error] = parseGPX(testGPXFile, {
		removeEmptyFields: false,
		avgSpeedThreshold: 0.000215,
	})
	if (error) throw error

	expect(parsedGPX.metadata.name).toBe('GPX Test')
	expect(parsedGPX.waypoints[0].name).toBe('Porte de Carquefou')
})

test('avgSpeedThreshold changes how much travel time counts as moving', () => {
	const [permissive, permissiveError] = parseGPX(timedTrackGPXFile, {
		removeEmptyFields: true,
		avgSpeedThreshold: 0,
	})
	if (permissiveError) throw permissiveError

	const [strict, strictError] = parseGPX(timedTrackGPXFile, {
		removeEmptyFields: true,
		avgSpeedThreshold: 999,
	})
	if (strictError) throw strictError

	const permissiveDuration = permissive.tracks[0].duration
	const strictDuration = strict.tracks[0].duration

	// Same total elapsed time either way...
	expect(permissiveDuration.totalDuration).toBe(strictDuration.totalDuration)
	// ...but a stricter threshold treats the same movement as resting.
	expect(permissiveDuration.movingDuration).toBeGreaterThan(
		strictDuration.movingDuration
	)
})
