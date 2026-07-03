import { describe, expect, test } from 'vitest'
import {
	calculateDistance,
	calculateDuration,
	calculateElevation,
	calculateSlopes,
	haversineDistance,
} from '../lib/math_helpers'
import type { Point } from '../lib/types'

// helpers.spec.ts already checks that applying every math helper to a real
// parsed track/route doesn't throw. These tests exercise each helper
// directly with small, hand-checkable point sets, since the single-point
// fixture used there never enters most of these functions' loops.

function point(overrides: Partial<Point> = {}): Point {
	return {
		latitude: 0,
		longitude: 0,
		elevation: null,
		time: null,
		extensions: null,
		...overrides,
	}
}

describe('haversineDistance', () => {
	test('is zero for identical points', () => {
		const p = point({ latitude: 45, longitude: -1 })
		expect(haversineDistance(p, p)).toBe(0)
	})

	test('is symmetric', () => {
		const a = point({ latitude: 45, longitude: -1 })
		const b = point({ latitude: 46, longitude: 2 })
		expect(haversineDistance(a, b)).toBe(haversineDistance(b, a))
	})

	test('matches the expected distance for one degree of longitude at the equator', () => {
		const a = point({ latitude: 0, longitude: 0 })
		const b = point({ latitude: 0, longitude: 1 })
		expect(haversineDistance(a, b)).toBeCloseTo(111194.93, 1)
	})
})

describe('calculateDistance', () => {
	test('returns a single zero entry for zero or one points', () => {
		expect(calculateDistance([])).toStrictEqual({
			cumulative: [0],
			total: 0,
		})
		expect(calculateDistance([point()])).toStrictEqual({
			cumulative: [0],
			total: 0,
		})
	})

	test('accumulates the distance between each pair of points', () => {
		const points = [
			point({ latitude: 0, longitude: 0 }),
			point({ latitude: 0, longitude: 1 }),
		]
		const expectedDistance = haversineDistance(points[0], points[1])

		expect(calculateDistance(points)).toStrictEqual({
			cumulative: [0, expectedDistance],
			total: expectedDistance,
		})
	})
})

describe('calculateElevation', () => {
	test('returns all nulls when no point has an elevation', () => {
		expect(calculateElevation([point()])).toStrictEqual({
			maximum: null,
			minimum: null,
			positive: null,
			negative: null,
			average: null,
		})
	})

	test('computes min, max, average, and gain/loss across points with elevation', () => {
		const points = [
			point({ elevation: 10 }),
			point({ elevation: 15 }),
			point({ elevation: 5 }),
		]

		expect(calculateElevation(points)).toStrictEqual({
			maximum: 15,
			minimum: 5,
			positive: 5,
			negative: 10,
			average: 10,
		})
	})

	test('skips points without an elevation rather than treating them as zero', () => {
		const points = [
			point({ elevation: 10 }),
			point({ elevation: null }),
			point({ elevation: 20 }),
		]

		expect(calculateElevation(points)).toStrictEqual({
			maximum: 20,
			minimum: 10,
			positive: null,
			negative: null,
			average: 15,
		})
	})
})

describe('calculateSlopes', () => {
	test('returns an empty array for zero or one points', () => {
		expect(calculateSlopes([], [])).toStrictEqual([])
		expect(calculateSlopes([point()], [0])).toStrictEqual([])
	})

	test('computes the elevation grade as a percentage between adjacent points', () => {
		const points = [
			point({ elevation: 10 }),
			point({ elevation: 15 }),
			point({ elevation: 5 }),
		]
		const cumulativeDistance = [0, 100, 200]

		expect(calculateSlopes(points, cumulativeDistance)).toStrictEqual([
			5, -10,
		])
	})
})

describe('calculateDuration', () => {
	test('returns zeroed-out stats for zero points', () => {
		expect(
			calculateDuration([], { cumulative: [0], total: 0 })
		).toStrictEqual({
			startTime: null,
			endTime: null,
			cumulative: [0],
			movingDuration: 0,
			totalDuration: 0,
		})
	})

	test('a lower avgSpeedThreshold counts more travel time as moving', () => {
		// Three points, one second apart, each real movement covering
		// roughly 100 meters (see math behind these coordinates in
		// edge-case-fixtures.ts's timedTrackGPXFile).
		const points = [
			point({
				latitude: 45.0,
				longitude: -1.0,
				time: new Date('2020-01-01T00:00:00Z'),
			}),
			point({
				latitude: 45.0009,
				longitude: -1.0,
				time: new Date('2020-01-01T00:00:01Z'),
			}),
			point({
				latitude: 45.0018,
				longitude: -1.0,
				time: new Date('2020-01-01T00:00:02Z'),
			}),
		]
		const distance = calculateDistance(points)

		const permissive = calculateDuration(points, distance, {
			removeEmptyFields: true,
			avgSpeedThreshold: 0,
		})
		const strict = calculateDuration(points, distance, {
			removeEmptyFields: true,
			avgSpeedThreshold: 999,
		})

		// Same total duration either way; the threshold only changes how
		// much of it counts as "moving" versus "resting".
		expect(permissive.totalDuration).toBe(1)
		expect(strict.totalDuration).toBe(1)
		expect(permissive.movingDuration).toBe(1)
		expect(strict.movingDuration).toBe(0)
	})
})
