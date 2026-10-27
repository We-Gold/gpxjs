import type { Extensions, ExtensionValue } from './types'
import {
	array,
	CDATA_SECTION_NODE,
	custom,
	ELEMENT_NODE,
	type ObjectMapping,
	object,
	scalar,
	TEXT_NODE,
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

// Namespace that `xmlns`/`xmlns:*` declaration attributes live in.
export const XMLNS_NS = 'http://www.w3.org/2000/xmlns/'
// Namespace of the built-in `xml:` prefix (e.g. xml:lang).
const XML_NS = 'http://www.w3.org/XML/1998/namespace'

export function writeExtensions(
	doc: Document,
	srcObj: Extensions,
	dstElem: Element
) {
	// Namespace declarations go first, so prefixed attributes and children
	// below can resolve against them regardless of key order.
	for (const key in srcObj) {
		if (key === '@xmlns' || key.startsWith('@xmlns:')) {
			dstElem.setAttributeNS(XMLNS_NS, key.slice(1), String(srcObj[key]))
		}
	}

	for (const key in srcObj) {
		const value = srcObj[key]
		// `#text` and `@name` keys are the markers readExtensions uses for an
		// element's own text and attributes; every other key is a child element.
		if (key === '#text') {
			dstElem.appendChild(doc.createTextNode(String(value)))
		} else if (key[0] === '@') {
			const name = key.slice(1)
			// Already written by the loop above.
			if (name === 'xmlns' || name.startsWith('xmlns:')) continue
			const prefix = getPrefix(name)
			if (prefix === null) {
				dstElem.setAttribute(name, String(value))
			} else {
				// Same fallback as for elements: an unresolvable prefix is put in
				// the GPX namespace so the output stays well-formed.
				const ns = lookupNamespace(dstElem, prefix) ?? GPX_NS
				dstElem.setAttributeNS(ns, name, String(value))
			}
		} else if (Array.isArray(value)) {
			for (const item of value)
				writeExtensionElement(doc, key, item, dstElem)
		} else {
			writeExtensionElement(doc, key, value, dstElem)
		}
	}
}

function writeExtensionElement(
	doc: Document,
	name: string,
	value: ExtensionValue,
	dstElem: Element
) {
	// The element's own declaration (e.g. an inline xmlns:ns3 on a Garmin
	// extension) wins over one inherited from an ancestor. An unresolvable
	// prefix falls back to the GPX namespace so the output stays well-formed.
	const prefix = getPrefix(name)
	const ownDecl =
		typeof value === 'object'
			? value[prefix === null ? '@xmlns' : `@xmlns:${prefix}`]
			: undefined
	const ns =
		typeof ownDecl === 'string'
			? ownDecl
			: prefix === null
				? GPX_NS
				: (lookupNamespace(dstElem, prefix) ?? GPX_NS)

	const elem = doc.createElementNS(ns, name)
	dstElem.appendChild(elem)
	if (typeof value === 'object') {
		writeExtensions(doc, value, elem)
	} else {
		elem.appendChild(doc.createTextNode(value.toString()))
	}
}

function getPrefix(name: string): string | null {
	const colon = name.indexOf(':')
	return colon === -1 ? null : name.slice(0, colon)
}

// Walks up from `elem` looking for an xmlns:prefix declaration. Done by hand
// rather than with Node.lookupNamespaceURI, since xmldom-qsa doesn't see
// declarations added with setAttributeNS.
function lookupNamespace(elem: Element, prefix: string): string | null {
	// `xml:` is bound by the XML spec itself and never declared in a file.
	if (prefix === 'xml') return XML_NS
	let node: Node | null = elem
	while (node !== null && node.nodeType === ELEMENT_NODE) {
		const ns = (node as Element).getAttributeNS(XMLNS_NS, prefix)
		if (ns) return ns
		node = node.parentNode
	}
	return null
}

export function readExtensions(srcElem: Element): Extensions {
	const extensions: Extensions = {}

	const attributes = srcElem.attributes
	for (let i = 0; i < attributes.length; i++) {
		const attr = attributes[i]
		extensions[`@${attr.name}`] = toScalar(attr.value)
	}

	// Walk childNodes directly rather than Array.from(...).filter().forEach():
	// this runs once per point on a track, and the intermediate array plus
	// per-child closures were needless allocation.
	let text = ''
	const children = srcElem.childNodes
	for (let i = 0; i < children.length; i++) {
		const child = children[i]
		if (
			child.nodeType === TEXT_NODE ||
			child.nodeType === CDATA_SECTION_NODE
		) {
			text += child.nodeValue
			continue
		}
		// Anything else that isn't an element (comments, processing
		// instructions) carries no data, so it's skipped.
		if (child.nodeType !== ELEMENT_NODE) continue

		const tagName = child.nodeName
		const value = readExtensionValue(child as unknown as Element)
		const existing = extensions[tagName]
		if (existing === undefined) {
			extensions[tagName] = value
		} else if (Array.isArray(existing)) {
			existing.push(value)
		} else {
			extensions[tagName] = [existing, value]
		}
	}

	text = text.trim()
	if (text) extensions['#text'] = toScalar(text)

	return extensions
}

// Fast path for the common case of an element holding just text (e.g.
// <gpxtpx:hr>140</gpxtpx:hr>), which collapses to a plain scalar.
function readExtensionValue(elem: Element): ExtensionValue {
	if (elem.attributes.length === 0) {
		let text = ''
		let hasElements = false
		const children = elem.childNodes
		for (let i = 0; i < children.length; i++) {
			const type = children[i].nodeType
			if (type === ELEMENT_NODE) {
				hasElements = true
				break
			}
			if (type === TEXT_NODE || type === CDATA_SECTION_NODE)
				text += children[i].nodeValue
		}
		if (!hasElements) {
			text = text.trim()
			return text ? toScalar(text) : {}
		}
	}
	return readExtensions(elem)
}

function toScalar(text: string): string | number {
	// +'' is 0 rather than NaN, so '' would pass the check below and then
	// become NaN from parseFloat. Keep it as an empty string instead.
	if (text === '') return text
	return Number.isNaN(+text) ? text : parseFloat(text)
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
		time: scalar({ type: 'date' }),
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
