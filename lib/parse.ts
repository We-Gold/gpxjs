import {
	calculateDistance,
	calculateElevation,
	calculateSlopes,
} from "./math_helpers"
import { ParsedGPX } from "./parsed_gpx"
import {
	ParsedGPXInputs,
	Point,
	Route,
	Track,
	Waypoint,
	Extensions,
} from "./types"

/**
 * Converts the given GPX XML to a JavaScript Object with the ability to convert to GeoJSON.
 *
 * @param gpxSource A string containing the source GPX XML
 * @returns A ParsedGPX with all of the parsed data and a method to convert to GeoJSON
 */
export const parseGPX = (gpxSource: string) => {
	const parseMethod = (gpxSource: string): Document | null => {
		// Verify that we are in a browser
		if (typeof document == undefined) return null

		const domParser = new window.DOMParser()
		return domParser.parseFromString(gpxSource, "text/xml")
	}

	return parseGPXWithCustomParser(gpxSource, parseMethod)
}

/**
 * Converts the given GPX XML to a JavaScript Object with the ability to convert to GeoJSON.
 * This uses a **custom** method supplied by the user. This is most applicable to non-browser environments.
 *
 * @param gpxSource A string containing the source GPX XML
 * @param parseGPXToXML An optional method that parses gpx to a usable XML format
 * @returns A ParsedGPX with all of the parsed data and a method to convert to GeoJSON
 */
export const parseGPXWithCustomParser = (
	gpxSource: string,
	parseGPXToXML: (gpxSource: string) => Document | null
): [null, Error] | [ParsedGPX, null] => {
	// Parse the GPX string using the given parse method
	const parsedSource = parseGPXToXML(gpxSource)

	// Verify that the parsed data is present
	if (parsedSource === null)
		return [null, new Error("Provided parsing method failed.")]

	const output: ParsedGPXInputs = {
		xml: parsedSource,
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
		const linkElement = querySelectDirectDescendant(metadata, "link")
		if (linkElement !== null) {
			output.metadata.link = {
				href: linkElement.getAttribute("href") ?? "",
				text: getElementValue(linkElement, "text"),
				type: getElementValue(linkElement, "type"),
			}
		}
	}

	output.metadata = removeNullFields(output.metadata)

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

		const rawElevation = parseFloat(getElementValue(waypoint, "ele") ?? "")
		point.elevation = isNaN(rawElevation) ? null : rawElevation

		const rawTime = getElementValue(waypoint, "time")
		point.time = rawTime == null ? null : new Date(rawTime)

		output.waypoints.push(point)
	}

	output.waypoints = removeNullFields(output.waypoints)

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

		const type = querySelectDirectDescendant(routeElement, "type")
		route.type = type?.innerHTML ?? type?.textContent ?? null

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

	// output.routes = removeNullFields(output.routes)

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

		const type = querySelectDirectDescendant(trackElement, "type")
		track.type = type?.innerHTML ?? type?.textContent ?? null

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
				let extensions: Extensions = {}
				extensions = parseExtensions(
					extensions,
					extensionsElement.childNodes
				)
				// Store all available extensions as numbers
				point.extensions = extensions
			}

			const rawElevation = parseFloat(getElementValue(trackPoint, "ele") ?? "")
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

	return [new ParsedGPX(output), null]
}

const parseExtensions = (
	extensions: Extensions,
	extensionChildrenCollection: NodeListOf<ChildNode>
) => {
	Array.from(extensionChildrenCollection)
		.filter((child: ChildNode) => child.nodeType === 1)
		.forEach((child: ChildNode) => {
			const tagName = child.nodeName
			if (
				child.childNodes?.length === 1 &&
				child.childNodes[0].nodeType === 3 &&
				child.childNodes[0].textContent
			) {
				const textContent = child.childNodes[0].textContent.trim()
				const value = isNaN(+textContent)
					? textContent
					: parseFloat(textContent)
				extensions[tagName] = value
			} else {
				extensions[tagName] = {}
				extensions[tagName] = parseExtensions(
					extensions[tagName] as Extensions,
					child.childNodes
				)
			}
		})

	return extensions
}

/**
 * Extracts a value from a node within a parent element.
 * This is useful when there are nested tags within the DOM.
 *
 * @param parent An element to extract a value from
 * @param tag The tag of the child element that contains the desired data (e.g. "time" or "name")
 * @returns A string containing the desired value
 */
const getElementValue = (parent: Element, tag: string): string | null => {
	const element = parent.querySelector(tag)

	// Extract and return the value within the parent element
	if (element !== null) {
		return element.firstChild?.textContent ?? element.innerHTML ?? null
	} else return null
}

/**
 * Find a direct descendent of the given element. If it is nested more than one layer down,
 * it will not be found.
 *
 * @param parent A parent element to search within
 * @param tag The tag of the child element to search for
 * @returns The desired inner element
 */
const querySelectDirectDescendant = (
	parent: Element,
	tag: string
): Element | null => {
	try {
		// Find the first direct matching direct descendent
		const result = parent.querySelector(`:scope > ${tag}`)
		return result
	} catch (e) {
		// Handle non-browser or older environments that don't support :scope
		if (parent.childNodes) {
			return (
				(Array.from(parent.childNodes) as Element[]).find(
					(element) => element.tagName == tag
				) ?? null
			)
		} else return null
	}
}

const removeNullFields = <T>(object: T): T => {
	// Return non-object values as-is
	if (typeof object !== 'object' || object === null) {
		return object
	}

	// Remove null fields from arrays
	if (Array.isArray(object)) {
		return object
			.map(removeNullFields)
			.filter(value => value != null) as T
	}

	// Recursively remove null fields from object
	const result: { [key: string]: any } = {}
	for (const [key, value] of Object.entries(object)) {
		const processedValue = removeNullFields(value)
		if (processedValue != null) {
			result[key] = processedValue
		}
	}

	return result as T
}