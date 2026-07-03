import type { Extensions } from './types'
import {
	array,
	custom,
	type ObjectMapping,
	object,
	scalar,
	unwrap,
} from './xml_object_mapping'

/**
 * This file is the single declarative description of the GPX schema, shared
 * by both `stringify.ts` (object -> XML) and `parse.ts` (XML -> object). See
 * `xml_object_mapping.ts` for the generic engine that reads/writes a mapping
 * like this one. Keeping the schema in one place means a field added here is
 * automatically handled in both directions, instead of parsing and
 * stringifying slowly drifting apart from each other.
 */

// GPX XML Namespace
export const GPX_NS = 'http://www.topografix.com/GPX/1/1'

/****
 * Extensions hold arbitrary, unstructured data, so they need their own
 * read/write functions rather than a declarative field-by-field mapping.
 ****/

export function writeExtensions(
	doc: Document,
	srcObj: Extensions,
	dstElem: Element
) {
	for (const key in srcObj) {
		const elem = doc.createElementNS(GPX_NS, key)
		dstElem.appendChild(elem)
		const value = srcObj[key]
		if (typeof value === 'object') {
			writeExtensions(doc, value, elem)
		} else {
			const node = doc.createTextNode(value.toString())
			elem.appendChild(node)
		}
	}
}

export function readExtensions(srcElem: Element): Extensions {
	const extensions: Extensions = {}

	Array.from(srcElem.childNodes)
		.filter((child: ChildNode) => child.nodeType === 1)
		.forEach((child: ChildNode) => {
			const tagName = child.nodeName
			if (
				child.childNodes?.length === 1 &&
				child.childNodes[0].nodeType === 3 &&
				child.childNodes[0].textContent
			) {
				const textContent = child.childNodes[0].textContent.trim()
				const value = Number.isNaN(+textContent)
					? textContent
					: parseFloat(textContent)
				extensions[tagName] = value
			} else {
				extensions[tagName] = readExtensions(
					child as unknown as Element
				)
			}
		})

	return extensions
}

/****
 * GPX Schema Mapping
 ****/

const LINK_FIELDS: ObjectMapping = {
	'@href': scalar({ type: 'attrString' }),
	text: scalar(),
	type: scalar(),
}

// The GPX 1.1 XSD defines <wpt>, <trkpt>, and <rtept> as the same element
// type (wptType), so they share one field mapping here. Point and Waypoint
// are likewise the same TS type (see types.ts), rather than <trkpt>/<rtept>
// only exposing a handful of wptType's fields.
const WPT_TYPE_FIELDS: ObjectMapping = {
	'@lat': scalar({ expr: 'latitude', type: 'float' }),
	'@lon': scalar({ expr: 'longitude', type: 'float' }),
	name: scalar(),
	desc: scalar({ expr: 'description' }),
	ele: scalar({ expr: 'elevation', type: 'floatOrNull' }),
	time: scalar({ type: 'date' }),
	cmt: scalar({ expr: 'comment' }),
	sym: scalar({ expr: 'symbol' }),
	magvar: scalar({ expr: 'magneticVariation', type: 'floatOrNull' }),
	geoidheight: scalar({ expr: 'geoidHeight', type: 'floatOrNull' }),
	src: scalar(),
	link: array(LINK_FIELDS),
	type: scalar(),
	fix: scalar(),
	sat: scalar({ expr: 'satellites', type: 'intOrNull' }),
	hdop: scalar({ type: 'floatOrNull' }),
	vdop: scalar({ type: 'floatOrNull' }),
	pdop: scalar({ type: 'floatOrNull' }),
	ageofdgpsdata: scalar({ expr: 'ageOfDgpsData', type: 'floatOrNull' }),
	dgpsid: scalar({ expr: 'dgpsId', type: 'intOrNull' }),
	extensions: custom(writeExtensions, readExtensions),
}

export const GPX_MAPPING: ObjectMapping = {
	'@version': scalar({ type: 'attrString' }),
	'@creator': scalar({ type: 'attrString' }),
	metadata: object({
		name: scalar(),
		desc: scalar({ expr: 'description' }),
		author: object({
			name: scalar(),
			email: object({
				'@id': scalar({ type: 'attrString' }),
				'@domain': scalar({ type: 'attrString' }),
			}),
			link: object(LINK_FIELDS),
		}),
		copyright: object({
			'@author': scalar({ type: 'attrString' }),
			year: scalar(),
			license: scalar(),
		}),
		link: array(LINK_FIELDS),
		time: scalar(),
		keywords: scalar(),
		bounds: object({
			'@minlat': scalar({ expr: 'minLatitude', type: 'floatOrNull' }),
			'@minlon': scalar({ expr: 'minLongitude', type: 'floatOrNull' }),
			'@maxlat': scalar({ expr: 'maxLatitude', type: 'floatOrNull' }),
			'@maxlon': scalar({ expr: 'maxLongitude', type: 'floatOrNull' }),
		}),
		extensions: custom(writeExtensions, readExtensions),
	}),
	wpt: array(WPT_TYPE_FIELDS, { expr: 'waypoints' }),
	trk: array(
		{
			name: scalar(),
			cmt: scalar({ expr: 'comment' }),
			desc: scalar({ expr: 'description' }),
			src: scalar(),
			number: scalar(),
			link: array(LINK_FIELDS),
			type: scalar(),
			extensions: custom(writeExtensions, readExtensions),
			// A <trk> can have more than one <trkseg>; the mapping engine
			// concatenates every matching <trkseg>'s points into `points`
			// here (see the self-mapped-object handling in
			// xml_object_mapping.ts). `segmentExtensions` only reflects the
			// first <trkseg> that has an <extensions> element, since
			// `points` has no notion of segment boundaries to hang more
			// than one set of segment extensions off of.
			trkseg: unwrap({
				trkpt: array(WPT_TYPE_FIELDS, { expr: 'points' }),
				extensions: custom(writeExtensions, readExtensions, {
					expr: 'segmentExtensions',
				}),
			}),
		},
		{ expr: 'tracks' }
	),
	rte: array(
		{
			name: scalar(),
			cmt: scalar({ expr: 'comment' }),
			desc: scalar({ expr: 'description' }),
			src: scalar(),
			number: scalar(),
			link: array(LINK_FIELDS),
			type: scalar(),
			rtept: array(WPT_TYPE_FIELDS, { expr: 'points' }),
			extensions: custom(writeExtensions, readExtensions),
		},
		{ expr: 'routes' }
	),
	extensions: custom(writeExtensions, readExtensions),
}
