import { GPX_MAPPING } from './gpx_mapping'
import {
	calculateDistance,
	calculateDuration,
	calculateElevation,
	calculateSlopes,
} from './math_helpers'
import { DEFAULT_OPTIONS } from './options'
import { ParsedGPX } from './parsed_gpx'
import type { Options, ParsedGPXInputs, Route, Track } from './types'
import { readObject } from './xml_object_mapping'

/**
 * Converts the given GPX XML to a JavaScript Object with the ability to convert to GeoJSON.
 *
 * @param gpxSource A string containing the source GPX XML
 * @param removeEmptyFields Whether or not to remove null or undefined fields from the output
 * @returns A ParsedGPX with all of the parsed data and a method to convert to GeoJSON
 */
export const parseGPX = (
	gpxSource: string,
	options: Options = DEFAULT_OPTIONS
) => {
	const parseMethod = (gpxSource: string): Document | null => {
		// Verify that we are in a browser
		if (typeof document === 'undefined') return null
		if (typeof window === 'undefined') {
			console.error(
				'window is undefined, try to use the parseGPXWithCustomParser method'
			)
			return null
		}
		const domParser = new window.DOMParser()
		return domParser.parseFromString(gpxSource, 'text/xml')
	}
	const allOptions = { ...DEFAULT_OPTIONS, ...options }
	return parseGPXWithCustomParser(gpxSource, parseMethod, allOptions)
}

/**
 * Converts the given GPX XML to a JavaScript Object with the ability to convert to GeoJSON.
 * This uses a **custom** method supplied by the user. This is most applicable to non-browser environments.
 *
 * @param gpxSource A string containing the source GPX XML
 * @param parseGPXToXML An optional method that parses gpx to a usable XML format
 * @param removeEmptyFields Whether or not to remove null or undefined fields from the output
 * @returns A ParsedGPX with all of the parsed data and a method to convert to GeoJSON
 */
export const parseGPXWithCustomParser = (
	gpxSource: string,
	parseGPXToXML: (gpxSource: string) => Document | null,
	options: Options = DEFAULT_OPTIONS
): [null, Error] | [ParsedGPX, null] => {
	// Parse the GPX string using the given parse method
	const parsedSource = parseGPXToXML(gpxSource)

	// Verify that the parsed data is present
	if (parsedSource === null)
		return [null, new Error('Provided parsing method failed.')]

	const output: ParsedGPXInputs = {
		xml: parsedSource,
		metadata: {
			name: '',
			description: '',
			time: '',
			author: null,
			link: null,
			copyright: null,
			keywords: '',
			bounds: null,
		},
		waypoints: [],
		tracks: [],
		routes: [],
	}

	// Read every field described by GPX_MAPPING, the same declarative schema
	// used by `stringify.ts` to go the other direction. This keeps parsing
	// and stringifying from drifting apart, since both read from one
	// definition of what a GPX file looks like.
	//
	// Malformed XML can produce a Document with no root element at all, in
	// which case there's nothing to read and the defaults above stand.
	if (parsedSource.documentElement !== null) {
		readObject(GPX_MAPPING, parsedSource.documentElement, output)
	}

	// Distance, duration, elevation, and slopes aren't part of the GPX
	// schema itself, they're derived from a track/route's points, so they're
	// computed here rather than declared in the mapping.
	for (const trackOrRoute of [...output.tracks, ...output.routes] as (
		| Track
		| Route
	)[]) {
		trackOrRoute.distance = calculateDistance(trackOrRoute.points)
		trackOrRoute.duration = calculateDuration(
			trackOrRoute.points,
			trackOrRoute.distance,
			options
		)
		trackOrRoute.elevation = calculateElevation(trackOrRoute.points)
		trackOrRoute.slopes = calculateSlopes(
			trackOrRoute.points,
			trackOrRoute.distance.cumulative
		)
	}

	if (options.removeEmptyFields) {
		deleteNullFields(output.metadata)
		deleteNullFields(output.waypoints)
		deleteNullFields(output.tracks)
		deleteNullFields(output.routes)
	}

	return [new ParsedGPX(output, options), null]
}

export const deleteNullFields = <T>(object: T) => {
	// Return non-object values as-is
	if (typeof object !== 'object' || object === null || object === undefined) {
		return
	}

	// Remove null fields from arrays
	if (Array.isArray(object)) {
		object.forEach(deleteNullFields)
		return
	}

	// Recursively remove null fields from object
	for (const [key, value] of Object.entries(object)) {
		if (value == null || value === undefined) {
			delete (object as { [key: string]: any })[key]
		} else {
			deleteNullFields(value)
		}
	}
}
