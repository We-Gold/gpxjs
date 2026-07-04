import type { MathHelperArgs, MathHelperFunction } from './math_helpers'
import { removeEmptyFields } from './remove_empty_fields'
import type {
	Extensions,
	Feature,
	GeoJSON,
	MetaData,
	Options,
	ParsedGPXInputs,
	Route,
	Track,
	Waypoint,
	WaypointFeature,
} from './types'

/**
 * Represents a parsed GPX object.
 * All internal data is accessible, and can be converted to GeoJSON.
 */
export class ParsedGPX {
	public xml: Document
	public metadata: MetaData
	public waypoints: Waypoint[]
	public tracks: Track[]
	public routes: Route[]
	/** Extensions on the root `<gpx>` element itself. */
	public extensions: Extensions | null
	/** The `version` attribute of the root `<gpx>` element, e.g. `"1.1"`. */
	public version: string | null
	/** The `creator` attribute of the root `<gpx>` element, e.g. `"Garmin Connect"`. */
	public creator: string | null
	private options: Options

	constructor(
		{
			xml,
			metadata,
			waypoints,
			tracks,
			routes,
			extensions,
			version,
			creator,
		}: ParsedGPXInputs,
		options: Options
	) {
		this.xml = xml
		this.metadata = metadata
		this.waypoints = waypoints
		this.tracks = tracks
		this.routes = routes
		this.extensions = extensions
		this.version = version
		this.creator = creator
		this.options = options
	}

	/**
	 * Outputs the GPX data as GeoJSON, returning a JavaScript Object.
	 *
	 * @returns The GPX data converted to the GeoJSON format
	 */
	toGeoJSON() {
		const GeoJSON: GeoJSON = {
			type: 'FeatureCollection',
			features: [],
			properties: this.metadata,
		}

		// Converts a track or route to a feature and adds it to the output object
		const addFeature = (track: Track | Route) => {
			const {
				name,
				comment,
				description,
				src,
				number,
				link,
				type,
				points,
			} = track

			const feature: Feature = {
				type: 'Feature',
				geometry: { type: 'LineString', coordinates: [] },
				properties: {
					name,
					comment,
					description,
					src,
					number,
					link,
					type,
				},
			}

			for (const point of points) {
				const { longitude, latitude, elevation } = point
				feature.geometry.coordinates.push([
					longitude,
					latitude,
					elevation,
				])
			}

			GeoJSON.features.push(feature)
		}

		for (const track of [...this.tracks, ...this.routes]) {
			addFeature(track)
		}

		// Convert waypoints into features and add them to the output object
		for (const waypoint of this.waypoints) {
			const {
				name,
				symbol,
				comment,
				description,
				longitude,
				latitude,
				elevation,
			} = waypoint

			const feature: WaypointFeature = {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [longitude, latitude, elevation],
				},
				properties: { name, symbol, comment, description },
			}

			GeoJSON.features.push(feature)
		}

		return this.options.removeEmptyFields
			? removeEmptyFields(GeoJSON)
			: GeoJSON
	}

	/**
	 * Runs a math helper (e.g. `calculateDistance`) against a track's points.
	 *
	 * Generic over the specific helper `F` passed in, so the return type and
	 * extra argument types (e.g. `Distance` for `calculateDistance`, or
	 * `[Distance, Options?]` for `calculateDuration`) are inferred from
	 * whichever function is passed, rather than widened to the shared
	 * `MathHelperFunction` signature's `any`.
	 */
	applyToTrack<F extends MathHelperFunction>(
		trackIndex: number,
		func: F,
		...args: MathHelperArgs<F>
	): [ReturnType<F>, null] | [null, Error] {
		// Ensure that the track index is valid
		if (trackIndex < 0 || trackIndex >= this.tracks.length) {
			return [null, new Error('The track index is out of bounds.')]
		}

		try {
			return [func(this.tracks[trackIndex].points, ...args), null]
		} catch (error) {
			return [
				null,
				new Error(
					`An error occurred in the applyToTrack function.\n${error}\n
					Check that the track index is valid, and that the function has the correct arguments.`
				),
			]
		}
	}

	/** Same as `applyToTrack`, but against a route's points. */
	applyToRoute<F extends MathHelperFunction>(
		routeIndex: number,
		func: F,
		...args: MathHelperArgs<F>
	): [ReturnType<F>, null] | [null, Error] {
		// Ensure that the route index is valid
		if (routeIndex < 0 || routeIndex >= this.routes.length) {
			return [null, new Error('The route index is out of bounds.')]
		}

		try {
			return [func(this.routes[routeIndex].points, ...args), null]
		} catch (error) {
			return [
				null,
				new Error(
					`An error occurred in the applyToRoute function.\n${error}\n
					Check that the route index is valid, and that the function has the correct arguments.`
				),
			]
		}
	}
}
