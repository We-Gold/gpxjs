import {
	Feature,
	GeoJSON,
	MetaData,
	ParsedGPXInputs,
	Route,
	Track,
	Waypoint,
	WaypointFeature,
} from "./types"

import { deleteNullFields } from "./parse"
import {
	calculateDistance,
	calculateDuration,
	calculateElevation,
} from "./math_helpers"
import { DEFAULT_OPTIONS } from "./options"

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
	private removeEmptyFields: boolean

	constructor({ xml, metadata, waypoints, tracks, routes }: ParsedGPXInputs, removeEmptyFields: boolean = true) {
		this.xml = xml
		this.metadata = metadata
		this.waypoints = waypoints
		this.tracks = tracks
		this.routes = routes
		this.removeEmptyFields = removeEmptyFields
	}

	/**
	 * Outputs the GPX data as GeoJSON, returning a JavaScript Object.
	 *
	 * @returns The GPX data converted to the GeoJSON format
	 */
	toGeoJSON() {
		const GeoJSON: GeoJSON = {
			type: "FeatureCollection",
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
				type: "Feature",
				geometry: { type: "LineString", coordinates: [] },
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
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: [longitude, latitude, elevation],
				},
				properties: { name, symbol, comment, description },
			}

			GeoJSON.features.push(feature)
		}

		if (this.removeEmptyFields) deleteNullFields(GeoJSON)

		return GeoJSON
	}

	/** Track funcs **/
	calculateDistanceTrack(indexTrack = 0) {
		return calculateDistance(this.tracks[indexTrack].points)
	}
	calculateDurationTrack(indexTrack = 0, options: Options = DEFAULT_OPTIONS) {
		const optionsWithDefault = {
			...DEFAULT_OPTIONS,
			...options,
		}
		return calculateDuration(
			this.tracks[indexTrack].points,
			this.calculateDistanceTrack(indexTrack),
			optionsWithDefault
		)
	}
	calculateElevationTrack(indexTrack = 0) {
		return calculateElevation(this.tracks[indexTrack].points)
	}

	/** Route funcs **/
	calculateDistanceRoute(indexTrack = 0) {
		return calculateDistance(this.routes[indexTrack].points)
	}
	calculateDurationRoute(indexTrack = 0, options: Options = DEFAULT_OPTIONS) {
		const optionsWithDefault = {
			...DEFAULT_OPTIONS,
			...options,
		}
		return calculateDuration(
			this.routes[indexTrack].points,
			this.calculateDistanceRoute(indexTrack),
			optionsWithDefault
		)
	}
	calculateElevationRoute(indexTrack = 0) {
		return calculateElevation(this.routes[indexTrack].points)
	}
}
