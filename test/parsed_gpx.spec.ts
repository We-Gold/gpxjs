import { describe, expect, test } from 'vitest'
import { calculateDistance, parseGPX } from '../lib/index'

import { noTimeNoElevationGPXFile } from './edge-case-fixtures'
import { testGPXFile } from './test-gpx-file'

describe('applyToTrack / applyToRoute', () => {
	test('applyToTrack returns an error for an out-of-bounds index', () => {
		const [parsedGPX, error] = parseGPX(testGPXFile)
		if (error) throw error

		const [result, applyError] = parsedGPX.applyToTrack(
			99,
			calculateDistance
		)

		expect(result).toBeNull()
		expect(applyError?.message).toBe('The track index is out of bounds.')
	})

	test('applyToRoute returns an error for an out-of-bounds index', () => {
		const [parsedGPX, error] = parseGPX(testGPXFile)
		if (error) throw error

		const [result, applyError] = parsedGPX.applyToRoute(
			-1,
			calculateDistance
		)

		expect(result).toBeNull()
		expect(applyError?.message).toBe('The route index is out of bounds.')
	})

	test('applyToTrack returns an error wrapping one thrown by the supplied function', () => {
		const [parsedGPX, error] = parseGPX(testGPXFile)
		if (error) throw error

		const throwingFunction = () => {
			throw new Error('boom')
		}

		const [result, applyError] = parsedGPX.applyToTrack(0, throwingFunction)

		expect(result).toBeNull()
		expect(applyError?.message).toMatch(
			/An error occurred in the applyToTrack function/
		)
	})

	test('applyToRoute returns an error wrapping one thrown by the supplied function', () => {
		const [parsedGPX, error] = parseGPX(testGPXFile)
		if (error) throw error

		const throwingFunction = () => {
			throw new Error('boom')
		}

		const [result, applyError] = parsedGPX.applyToRoute(0, throwingFunction)

		expect(result).toBeNull()
		expect(applyError?.message).toMatch(
			/An error occurred in the applyToRoute function/
		)
	})
})

describe('toGeoJSON', () => {
	test('converts tracks, routes, and waypoints into GeoJSON features', () => {
		const [parsedGPX, error] = parseGPX(testGPXFile)
		if (error) throw error

		const geoJSON = parsedGPX.toGeoJSON()

		expect(geoJSON.type).toBe('FeatureCollection')
		expect(geoJSON.properties).toStrictEqual(parsedGPX.metadata)

		// One feature per track, route, and waypoint, in that order.
		expect(geoJSON.features).toHaveLength(
			parsedGPX.tracks.length +
				parsedGPX.routes.length +
				parsedGPX.waypoints.length
		)

		const track = parsedGPX.tracks[0]
		expect(geoJSON.features[0]).toStrictEqual({
			type: 'Feature',
			geometry: {
				type: 'LineString',
				coordinates: track.points.map((p) => [
					p.longitude,
					p.latitude,
					p.elevation,
				]),
			},
			properties: {
				name: track.name,
				comment: track.comment,
				description: track.description,
				src: track.src,
				number: track.number,
				link: track.link,
				type: track.type,
			},
		})

		const lastWaypoint = parsedGPX.waypoints[parsedGPX.waypoints.length - 1]
		const lastFeature = geoJSON.features[geoJSON.features.length - 1]
		expect(lastFeature).toStrictEqual({
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [
					lastWaypoint.longitude,
					lastWaypoint.latitude,
					lastWaypoint.elevation,
				],
			},
			// No `symbol` key: testGPXFile's waypoints don't have a <sym>
			// tag, so it's null on the parsed waypoint and removeEmptyFields
			// (on by default) strips it from the GeoJSON properties too.
			properties: {
				name: lastWaypoint.name,
				comment: lastWaypoint.comment,
				description: lastWaypoint.description,
			},
		})
	})

	test('keeps null fields when removeEmptyFields is false', () => {
		const [parsedGPX, error] = parseGPX(noTimeNoElevationGPXFile, {
			removeEmptyFields: false,
			avgSpeedThreshold: 0.000215,
		})
		if (error) throw error

		const geoJSON = parsedGPX.toGeoJSON()

		expect(geoJSON.features[0]).toStrictEqual({
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [-1.5153741828293, 47.253146555709, null],
			},
			properties: {
				name: 'No Time Or Elevation',
				symbol: null,
				comment: null,
				description: null,
			},
		})
	})
})
