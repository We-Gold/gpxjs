import { GPX_MAPPING, GPX_NS } from './gpx_mapping'
import type { ParsedGPX } from './parsed_gpx'
import { writeObject } from './xml_object_mapping'

interface XMLSerializationStrategy {
	serializeToString(doc: Document): string
}

/**
 * Converts a ParsedGPX object back into a GPX XML string.
 * @param gpx the parsed GPX object to serialize
 * @param customXmlSerializer an optional custom XMLSerializer implementation.
 *   If not specified, a default XMLSerializer instance will be created.
 * @returns a [xmlString, null] tuple on success, or [null, error] if writing
 *   or serializing failed (e.g. a custom serializer that throws).
 */
export function stringifyGPX(
	gpx: ParsedGPX,
	customXmlSerializer?: XMLSerializationStrategy
): [string, null] | [null, Error] {
	try {
		const doc = gpx.xml.implementation.createDocument(GPX_NS, 'gpx')
		doc.documentElement.setAttribute('version', '1.1')
		doc.documentElement.setAttribute('creator', 'gpxjs')
		writeObject(doc, GPX_NS, GPX_MAPPING, gpx, doc.documentElement)
		const serializer = customXmlSerializer ?? new XMLSerializer()
		return [serializer.serializeToString(doc), null]
	} catch (error) {
		return [null, error instanceof Error ? error : new Error(String(error))]
	}
}
