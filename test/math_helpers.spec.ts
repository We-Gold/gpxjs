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
		name: null,
		symbol: null,
		comment: null,
		description: null,
		latitude: 0,
		longitude: 0,
		elevation: null,
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

	test('treats equal consecutive elevations as neither gain nor loss', () => {
		const points = [
			point({ elevation: 10 }),
			point({ elevation: 10 }),
			point({ elevation: 15 }),
		]

		expect(calculateElevation(points)).toStrictEqual({
			maximum: 15,
			minimum: 10,
			positive: 5,
			negative: null,
			average: 35 / 3,
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

	test('only looks back 10 seconds when averaging speed', () => {
		// The average-speed window only looks back 10 seconds, so an older
		// point (here, 11 seconds before the last) should be excluded from
		// the calculation rather than skewing it.
		const points = [
			point({
				latitude: 45.0,
				longitude: -1.0,
				time: new Date('2020-01-01T00:00:00Z'),
			}),
			point({
				latitude: 45.0009,
				longitude: -1.0,
				time: new Date('2020-01-01T00:00:11Z'),
			}),
			point({
				latitude: 45.0018,
				longitude: -1.0,
				time: new Date('2020-01-01T00:00:12Z'),
			}),
		]
		const distance = calculateDistance(points)

		const { totalDuration, movingDuration } = calculateDuration(
			points,
			distance
		)

		// The last point is 12s after the first, but the lookback window used
		// to average speed only covers the last 10s of movement, so it
		// contributes nothing to the moving duration here.
		expect(totalDuration).toBe(11)
		expect(movingDuration).toBe(0)
	})

	test('skips an untimed point within the speed-averaging lookback window', () => {
		// The lookback loop walks backward over every prior point, not just
		// timed ones, so it needs to tolerate one with no time in the middle
		// of the window without breaking the average.
		const points = [
			point({
				latitude: 45.0,
				longitude: -1.0,
				time: new Date('2020-01-01T00:00:00Z'),
			}),
			point({ time: null }),
			point({
				latitude: 45.0018,
				longitude: -1.0,
				time: new Date('2020-01-01T00:00:02Z'),
			}),
			point({
				latitude: 45.0027,
				longitude: -1.0,
				time: new Date('2020-01-01T00:00:03Z'),
			}),
		]
		const distance = calculateDistance(points)

		expect(() => calculateDuration(points, distance)).not.toThrow()
	})

	test('carries the previous cumulative value forward when a point is missing a time', () => {
		// The middle point has no time, so it can't contribute to the moving
		// calculation; its cumulative entry should just repeat the previous one.
		const points = [
			point({
				latitude: 45.0,
				longitude: -1.0,
				time: new Date('2020-01-01T00:00:00Z'),
			}),
			point({ time: null }),
			point({
				latitude: 45.0018,
				longitude: -1.0,
				time: new Date('2020-01-01T00:00:02Z'),
			}),
		]
		const distance = calculateDistance(points)

		const { cumulative } = calculateDuration(points, distance)

		// The middle point (index 1) has no time and can't move the
		// cumulative value forward, so it repeats whatever came before it.
		expect(cumulative[2]).toBe(cumulative[1])
	})

	test('carries the previous cumulative value forward when consecutive points share a timestamp', () => {
		// Two points with the same timestamp produce a non-positive
		// movingTime, which shouldn't count as movement.
		const sameTime = new Date('2020-01-01T00:00:00Z')
		const points = [
			point({ latitude: 45.0, longitude: -1.0, time: sameTime }),
			point({ latitude: 45.0009, longitude: -1.0, time: sameTime }),
			point({
				latitude: 45.0018,
				longitude: -1.0,
				time: new Date('2020-01-01T00:00:02Z'),
			}),
		]
		const distance = calculateDistance(points)

		const { cumulative } = calculateDuration(points, distance)

		// The second point shares its timestamp with the first, so
		// movingTime is 0 and its cumulative entry repeats the first's.
		expect(cumulative[2]).toBe(cumulative[1])
	})
})
