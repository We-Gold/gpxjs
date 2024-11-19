import { Point, Distance, Elevation, Duration } from "./types"

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
 * Calculates duration statistics based on distance traveled and the time taken.
 *
 *
 * @param points A list of points with a time
 * @param distance A distance object containing the total distance and the cumulative distances
 * @returns A duration object
 */

export const calculateDuration = (
	points: Point[],
	distance: Distance
): Duration => {
	const allTimedPoints = []
	const cumulative = [0]
	let lastTime = 0

	for (let i = 0; i < points.length - 1; i++) {
		const time = points[i].time
		const dist = distance.cumulative[i]
		const previousPoint = cumulative[i]
		if (dist > 0) {
			// moving
			if (time === null) {
				// weird case
				cumulative.push(previousPoint)
			} else {
				const movingTime = time.getTime() - lastTime
				const movement = distance.cumulative[i + 1] - dist
				// Determine if movement is significant
				const nextCumul =
					movement / movingTime > 0.00055
						? previousPoint + movingTime
						: previousPoint
				cumulative.push(nextCumul)
			}
		} else {
			// not moving
			cumulative.push(previousPoint)
		}
		if (time !== null) {
			lastTime = time.getTime()
			allTimedPoints.push({ time, distance: dist })
		}
	}
	const totalDuration =
		allTimedPoints.length === 0
			? 0
			: allTimedPoints[allTimedPoints.length - 1].time.getTime() -
			  allTimedPoints[0].time.getTime()

	return {
		startTime: allTimedPoints.length ? allTimedPoints[0].time : null,
		endTime: allTimedPoints.length
			? allTimedPoints[allTimedPoints.length - 1].time
			: null,
		cumulative,
		movingDuration: cumulative[cumulative.length - 1] / 1000,
		totalDuration: totalDuration / 1000,
	}
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
