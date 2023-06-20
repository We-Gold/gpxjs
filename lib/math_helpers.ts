import { Point, Distance, Elevation } from "./types"

/**
 * Calculates the distances along a series of points using the haversine formula internally.
 *
 * @param points An array containing points with latitudes and longitudes
 * @returns A distance object containing the total distance and the cumulative distances
 */
export const calculateDistance = (points: Point[]): Distance => {
	const cumulativeDistance = [0]

	// Incrementally calculate the distance between adjacent points until
	// all of the distances have been accumulated
	for (let i = 0; i < points.length - 1; i++) {
		const currentTotalDistance =
			cumulativeDistance[i] + haversineDistance(points[i], points[i + 1])
		cumulativeDistance.push(currentTotalDistance)
	}

	return {
		cumulative: cumulativeDistance,
		total: cumulativeDistance[cumulativeDistance.length - 1],
	}
}

/**
 * Calculate the distance between two points with latitude and longitude
 * using the haversine formula.
 *
 * @param point1 A point with latitude and longitude
 * @param point2 A point with latitude and longitude
 * @returns The distance between the two points
 */
export const haversineDistance = (point1: Point, point2: Point): number => {
	const toRadians = (degrees: number) => (degrees * Math.PI) / 180

	const lat1Radians = toRadians(point1.latitude)
	const lat2Radians = toRadians(point2.latitude)
	const sinDeltaLatitude = Math.sin(
		toRadians(point2.latitude - point1.latitude) / 2
	)
	const sinDeltaLongitude = Math.sin(
		toRadians(point2.longitude - point1.longitude) / 2
	)
	const a =
		sinDeltaLatitude ** 2 +
		Math.cos(lat1Radians) * Math.cos(lat2Radians) * sinDeltaLongitude ** 2
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
	return 6371000 * c
}

/**
 * Calculates details about the elevation of the given points.
 * Points without elevations will be skipped.
 *
 * @param points A list of points with an elevation
 * @returns An elevation object containing details about the elevation of the points
 */
export const calculateElevation = (points: Point[]): Elevation => {
	let dp = 0
	let dn = 0
	const elevation = []
	let sum = 0

	// Calculate the positive and negative changes over the whole set of points
	for (let i = 0; i < points.length - 1; i++) {
		const nextElevation = points[i + 1]?.elevation
		const currentElevation = points[i]?.elevation

		if (nextElevation !== null && currentElevation !== null) {
			const diff = nextElevation - currentElevation
			if (diff < 0) dn += diff
			else if (diff > 0) dp += diff
		}
	}

	// Store all elevations and calculate the sum of the elevations
	for (const point of points) {
		if (point.elevation !== null) {
			elevation.push(point.elevation)
			sum += point.elevation
		}
	}

	return {
		maximum: elevation.length ? Math.max(...elevation) : null,
		minimum: elevation.length ? Math.min(...elevation) : null,
		positive: Math.abs(dp) || null,
		negative: Math.abs(dn) || null,
		average: elevation.length ? sum / elevation.length : null,
	}
}

/**
 * Calculates the elevation grade as a percent between the adjacent points in the list.
 * Points without elevation will be skipped.
 *
 * @param points A list of points with elevations
 * @param cumulativeDistance A list of cumulative distances aquired through the `calculateDistance` method
 * @returns A list of slopes between the given points
 */
export const calculateSlopes = (
	points: Point[],
	cumulativeDistance: number[]
): number[] => {
	const slopes = []

	for (let i = 0; i < points.length - 1; i++) {
		const nextElevation = points[i + 1]?.elevation
		const currentElevation = points[i]?.elevation

		if (nextElevation !== null && currentElevation !== null) {
			const elevationDifference = nextElevation - currentElevation
			const displacement =
				cumulativeDistance[i + 1] - cumulativeDistance[i]

			// Calculate the elevation grade as a percentage
			const slope = (elevationDifference * 100) / displacement
			slopes.push(slope)
		}
	}

	return slopes
}
