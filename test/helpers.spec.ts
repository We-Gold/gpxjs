import { test } from 'vitest'

import {
	calculateDistance,
	calculateDuration,
	calculateElevation,
	calculateSlopes,
	parseGPX,
} from '../lib/index'

import { testGPXFile } from './test-gpx-file'

test('All applied functions produce outputs without errors.', () => {
	const [parsedGPX, error] = parseGPX(testGPXFile)

	// Verify that the parsing was successful
	if (error) throw error

	// Apply all functions to the first track
	const [tdist, tdistError] = parsedGPX.applyToTrack(0, calculateDistance)
	if (tdistError) throw tdistError
	parsedGPX.applyToTrack(0, calculateDuration)
	parsedGPX.applyToTrack(0, calculateElevation)
	parsedGPX.applyToTrack(0, calculateSlopes, tdist.cumulative)

	// Apply all functions to the first route
	const [rdist, rdistError] = parsedGPX.applyToRoute(0, calculateDistance)
	if (rdistError) throw rdistError
	parsedGPX.applyToRoute(0, calculateDuration)
	parsedGPX.applyToRoute(0, calculateElevation)
	parsedGPX.applyToRoute(0, calculateSlopes, rdist.cumulative)
})
