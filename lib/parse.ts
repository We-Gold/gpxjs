import {
	calculateDistance,
	calculateElevation,
	calculateSlopes,
} from "./math_helpers"
import { ParsedGPX } from "./parsed_gpx"
import { ParsedGPXInputs, Point, Route, Track, Waypoint } from "./types"

/**
 * Converts the given GPX XML to a JavaScript Object with the ability to convert to GeoJSON.
 *
 * @param gpxSource A string containing the source GPX XML
 * @param CustomDOMParser An optional DOM Parser object for non-browser contexts
 * @returns A ParsedGPX with all of the parsed data and a method to convert to GeoJSON
 */
export const parseGPX = (
	gpxSource: string,
	CustomDOMParser: { new (): DOMParser; prototype: DOMParser } | null = null
) => {
	const output: ParsedGPXInputs = {
		xml: new Document(),
		metadata: {
			name: "",
			description: "",
			time: "",
			author: null,
			link: null,
		},
		waypoints: [],
		tracks: [],
		routes: [],
	}

	// Initialize a parser object to parse the xml input
	const domParserClass = CustomDOMParser ?? window.DOMParser
	const domParser = new domParserClass()
	output.xml = domParser.parseFromString(gpxSource, "text/xml")

	const metadata = output.xml.querySelector("metadata")
	if (metadata !== null) {
		// Store the top level elements of the metadata
		output.metadata.name = getElementValue(metadata, "name")
		output.metadata.description = getElementValue(metadata, "desc")
		output.metadata.time = getElementValue(metadata, "time")

		// Parse and store the tree of data associated with the author
		const authorElement = metadata.querySelector("author")
		if (authorElement !== null) {
			const emailElement = authorElement.querySelector("email")
			const linkElement = authorElement.querySelector("link")

			output.metadata.author = {
				name: getElementValue(authorElement, "name"),
				email:
					emailElement !== null
						? {
								id: emailElement.getAttribute("id") ?? "",
								domain:
									emailElement.getAttribute("domain") ?? "",
						  }
						: null,
				link:
					linkElement !== null
						? {
								href: linkElement.getAttribute("href") ?? "",
								text: getElementValue(linkElement, "text"),
								type: getElementValue(linkElement, "type"),
						  }
						: null,
			}
		}

		// Parse and store the link element and its associated data
		const linkElement = queryDirectSelector(metadata, "link")
		if (linkElement !== null) {
			output.metadata.link = {
				href: linkElement.getAttribute("href") ?? "",
				text: getElementValue(linkElement, "text"),
				type: getElementValue(linkElement, "type"),
			}
		}
	}

	// Parse and store all waypoints
	const waypoints = Array.from(output.xml.querySelectorAll("wpt"))
	for (const waypoint of waypoints) {
		const point: Waypoint = {
			name: getElementValue(waypoint, "name"),
			symbol: getElementValue(waypoint, "sym"),
			latitude: parseFloat(waypoint.getAttribute("lat") ?? ""),
			longitude: parseFloat(waypoint.getAttribute("lon") ?? ""),
			elevation: null,
			comment: getElementValue(waypoint, "cmt"),
			description: getElementValue(waypoint, "desc"),
			time: null,
		}

		const rawElevation = parseFloat(getElementValue(waypoint, "ele"))
		point.elevation = isNaN(rawElevation) ? null : rawElevation

		const rawTime = getElementValue(waypoint, "time")
		point.time = rawTime == null ? null : new Date(rawTime)

		output.waypoints.push(point)
	}

	const routes = Array.from(output.xml.querySelectorAll("rte"))
	for (const routeElement of routes) {
		const route: Route = {
			name: getElementValue(routeElement, "name"),
			comment: getElementValue(routeElement, "cmt"),
			description: getElementValue(routeElement, "desc"),
			src: getElementValue(routeElement, "src"),
			number: getElementValue(routeElement, "number"),
			type: null,
			link: null,
			points: [],
			distance: {
				cumulative: [],
				total: 0,
			},
			elevation: {
				maximum: null,
				minimum: null,
				average: null,
				positive: null,
				negative: null,
			},
			slopes: [],
		}

		const type = queryDirectSelector(routeElement, "type")
		route.type = type !== null ? type.innerHTML : null

		// Parse and store the link and its associated data
		const linkElement = routeElement.querySelector("link")
		if (linkElement !== null) {
			route.link = {
				href: linkElement.getAttribute("href") ?? "",
				text: getElementValue(linkElement, "text"),
				type: getElementValue(linkElement, "type"),
			}
		}

		// Parse and store all points in the route
		const routePoints = Array.from(routeElement.querySelectorAll("rtept"))
		for (const routePoint of routePoints) {
			const point: Point = {
				latitude: parseFloat(routePoint.getAttribute("lat") ?? ""),
				longitude: parseFloat(routePoint.getAttribute("lon") ?? ""),
				elevation: null,
				time: null,
				extensions: null,
			}

			const rawElevation = parseFloat(
				getElementValue(routePoint, "ele") ?? ""
			)
			point.elevation = isNaN(rawElevation) ? null : rawElevation

			const rawTime = getElementValue(routePoint, "time")
			point.time = rawTime == null ? null : new Date(rawTime)

			route.points.push(point)
		}

		route.distance = calculateDistance(route.points)
		route.elevation = calculateElevation(route.points)
		route.slopes = calculateSlopes(route.points, route.distance.cumulative)

		output.routes.push(route)
	}

	const tracks = Array.from(output.xml.querySelectorAll("trk"))
	for (const trackElement of tracks) {
		const track: Track = {
			name: getElementValue(trackElement, "name"),
			comment: getElementValue(trackElement, "cmt"),
			description: getElementValue(trackElement, "desc"),
			src: getElementValue(trackElement, "src"),
			number: getElementValue(trackElement, "number"),
			type: null,
			link: null,
			points: [],
			distance: {
				cumulative: [],
				total: 0,
			},
			elevation: {
				maximum: null,
				minimum: null,
				average: null,
				positive: null,
				negative: null,
			},
			slopes: [],
		}

		const type = queryDirectSelector(trackElement, "type")
		track.type = type !== null ? type.innerHTML : null

		// Parse and store the link and its associated data
		const linkElement = trackElement.querySelector("link")
		if (linkElement !== null) {
			track.link = {
				href: linkElement.getAttribute("href") ?? "",
				text: getElementValue(linkElement, "text"),
				type: getElementValue(linkElement, "type"),
			}
		}

		// Parse and store all track points
		const trackPoints = Array.from(trackElement.querySelectorAll("trkpt"))
		for (const trackPoint of trackPoints) {
			const point: Point = {
				latitude: parseFloat(trackPoint.getAttribute("lat") ?? ""),
				longitude: parseFloat(trackPoint.getAttribute("lon") ?? ""),
				elevation: null,
				time: null,
				extensions: null,
			}

			// Parse any extensions and store them in an object
			const extensionsElement = trackPoint.querySelector("extensions")
			if (extensionsElement !== null) {
				const extensions: any = {}

				// Store all available extensions as numbers
				for (const extension of extensionsElement.childNodes) {
					const name = extension.nodeName
					extensions[name] = parseFloat(
						(extension as Element).innerHTML
					)
				}

				point.extensions = extensions
			}

			const rawElevation = parseFloat(getElementValue(trackPoint, "ele"))
			point.elevation = isNaN(rawElevation) ? null : rawElevation

			const rawTime = getElementValue(trackPoint, "time")
			point.time = rawTime == null ? null : new Date(rawTime)

			track.points.push(point)
		}

		track.distance = calculateDistance(track.points)
		track.elevation = calculateElevation(track.points)
		track.slopes = calculateSlopes(track.points, track.distance.cumulative)

		output.tracks.push(track)
	}

	return new ParsedGPX(output)
}

/**
 * Extracts a value from a node within a parent element.
 * This is useful when there are nested tags within the DOM.
 *
 * @param parent An element to extract a value from
 * @param tag The tag of the child element that contains the desired data (e.g. "time" or "name")
 * @returns A string containing the desired value
 */
const getElementValue = (parent: Element, tag: string): string => {
	const element = parent.querySelector(tag)

	// Extract and return the value within the parent element
	if (element !== null) {
		return element.innerHTML != undefined
			? element.innerHTML
			: element.childNodes[0].textContent ?? ""
	} else return ""
}

/**
 * Finds a specific, known element within the given parent element.
 *
 * @param parent A parent element to search within
 * @param tag The tag of the child element to search for
 * @returns The desired inner element
 */
const queryDirectSelector = (parent: Element, tag: string): Element | null => {
	const elements = parent.querySelectorAll(tag)

	// End immediately if there are no matching elements
	if (elements.length === 0) return null

	let finalElem = elements[0]

	// Find the last node that fits the given tag within the parent
	if (elements.length > 1) {
		const directChildren = parent.childNodes

		// Find all nodes that match the given tag within the parent
		for (const child of directChildren) {
			if ((child as Element).tagName === tag.toUpperCase()) {
				finalElem = child as Element
			}
		}
	}

	return finalElem
}
