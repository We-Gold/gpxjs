import { describe, expect, test } from 'vitest'

import {
	DOMParser as QsaDOMParser,
	XMLSerializer as QsaXMLSerializer,
} from 'xmldom-qsa'
import { parseGPX, parseGPXWithCustomParser } from '../lib/index'
import { stringifyGPX } from '../lib/stringify'

// Covers #43: <extensions> content that carries its data in attributes,
// elements from a non-GPX namespace, and repeated sibling elements.
//
// Representation being tested:
//   - attributes become `@name` keys, with the same number coercion as text
//   - text alongside attributes goes under `#text`
//   - text-only elements still collapse to a plain scalar, as before
//   - a repeated sibling element becomes an array; a single one does not
// Unlike the rest of the schema, extensions have no fixed fields to give
// clean names to, so the markers are what keep an attribute distinct from
// a same-named child element and let stringifyGPX write each back as the
// right kind of node. Neither `@` nor `#` can start an XML name, so these
// keys can never collide with a child element's tag name.

const WEATHER_NS = 'http://example.com/weather/1'
const GARMIN_TPX_NS = 'http://www.garmin.com/xmlschemas/TrackPointExtension/v1'

// Weather-station data in an extension namespace declared on the root
// <gpx>, held in attributes at the metadata, route point, and root levels.
const ATTRIBUTE_EXTENSIONS_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test Creator"
	xmlns="http://www.topografix.com/GPX/1/1"
	xmlns:wx="${WEATHER_NS}">
	<metadata>
		<name>Attribute Extensions</name>
		<extensions>
			<wx:sensor wx:serial="3" model="TH-20"></wx:sensor>
			<wx:alerts>
				<wx:alert issued="2025-03-14">
					Gusts above 60 km/h expected after noon.
				</wx:alert>
			</wx:alerts>
			<wx:observers>
				<!-- A comment between elements shouldn't affect anything. -->
				<wx:observer wx:badge="31"/>
			</wx:observers>
		</extensions>
	</metadata>
	<wpt lat="1.0" lon="2.0">
		<name>Summit Hut</name>
		<extensions><wx:elevationBand>3</wx:elevationBand></extensions>
	</wpt>
	<rte>
		<name>Ridge Traverse</name>
		<extensions><wx:conditions>dry</wx:conditions></extensions>
		<rtept lat="1.0" lon="2.0"><ele>100</ele></rtept>
		<rtept lat="1.1" lon="2.1">
			<ele>120</ele>
			<extensions><wx:reading wx:sensor="5"/></extensions>
		</rtept>
	</rte>
	<extensions>
		<wx:stations>
			<wx:station kind="automatic" wx:sensor="5">
				<!-- Child elements alongside attributes. -->
				<wx:label>Summit Hut</wx:label>
				<wx:note>
					Solar powered, reports every ten minutes.
				</wx:note>
				<wx:status>online</wx:status>
			</wx:station>
		</wx:stations>
	</extensions>
</gpx>`

const REPEATED_SIBLINGS_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test Creator"
	xmlns="http://www.topografix.com/GPX/1/1"
	xmlns:wx="${WEATHER_NS}">
	<extensions>
		<wx:observers>
			<wx:observer wx:badge="31"/>
			<wx:observer wx:badge="48"/>
			<wx:observer wx:badge="52"/>
		</wx:observers>
		<tag>first</tag>
		<tag>second</tag>
		<single>only</single>
	</extensions>
</gpx>`

// Garmin-style extension whose namespace is declared inline on the
// extension element rather than on the root <gpx>.
const INLINE_NAMESPACE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test Creator" xmlns="http://www.topografix.com/GPX/1/1">
	<trk>
		<trkseg>
			<trkpt lat="1.0" lon="2.0">
				<extensions>
					<ns3:TrackPointExtension xmlns:ns3="${GARMIN_TPX_NS}">
						<ns3:hr>140</ns3:hr>
						<ns3:cad>85</ns3:cad>
					</ns3:TrackPointExtension>
				</extensions>
			</trkpt>
		</trkseg>
	</trk>
</gpx>`

// Attributes and text several levels below the top-level extension element.
const NESTED_EXTENSIONS_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test Creator"
	xmlns="http://www.topografix.com/GPX/1/1"
	xmlns:wx="${WEATHER_NS}">
	<extensions>
		<wx:station kind="automatic" wx:sensor="5">
			<wx:label>
				<wx:name lang="en" wx:verified="true">Summit Hut</wx:name>
				<wx:alt unit="m">
					<wx:source method="gps">2410</wx:source>
				</wx:alt>
			</wx:label>
		</wx:station>
	</extensions>
</gpx>`

const ATTRIBUTE_EDGE_CASES_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test Creator" xmlns="http://www.topografix.com/GPX/1/1">
	<extensions>
		<whitespaceOnly id="3">   </whitespaceOnly>
		<numericText unit="bpm">140</numericText>
		<emptyAttr value=""/>
	</extensions>
</gpx>`

const qsaParse = (source: string) =>
	parseGPXWithCustomParser(source, (txt) =>
		new QsaDOMParser().parseFromString(txt, 'text/xml')
	)

const parsers = [
	{ name: 'browser', parse: parseGPX },
	{ name: 'non-browser (xmldom-qsa)', parse: qsaParse },
]

describe.each(parsers)('extension attributes ($name)', ({ parse }) => {
	test('reads attributes on attribute-only elements (#43)', () => {
		const [gpx, error] = parse(ATTRIBUTE_EXTENSIONS_GPX)
		if (error) throw error

		expect(gpx.metadata.extensions).toEqual({
			'wx:sensor': { '@wx:serial': 3, '@model': 'TH-20' },
			'wx:alerts': {
				'wx:alert': {
					'@issued': '2025-03-14',
					'#text': 'Gusts above 60 km/h expected after noon.',
				},
			},
			'wx:observers': {
				'wx:observer': { '@wx:badge': 31 },
			},
		})
		expect(gpx.routes[0].points[1].extensions).toEqual({
			'wx:reading': { '@wx:sensor': 5 },
		})
	})

	test('reads attributes alongside child elements (#43)', () => {
		const [gpx, error] = parse(ATTRIBUTE_EXTENSIONS_GPX)
		if (error) throw error

		expect(gpx.extensions).toEqual({
			'wx:stations': {
				'wx:station': {
					'@kind': 'automatic',
					'@wx:sensor': 5,
					'wx:label': 'Summit Hut',
					'wx:note': 'Solar powered, reports every ten minutes.',
					'wx:status': 'online',
				},
			},
		})
	})

	test('keeps text-only extension elements as plain scalars', () => {
		const [gpx, error] = parse(ATTRIBUTE_EXTENSIONS_GPX)
		if (error) throw error

		expect(gpx.waypoints[0].extensions).toEqual({ 'wx:elevationBand': 3 })
		expect(gpx.routes[0].extensions).toEqual({ 'wx:conditions': 'dry' })
	})

	test('handles whitespace-only text, numeric text, and empty attributes', () => {
		const [gpx, error] = parse(ATTRIBUTE_EDGE_CASES_GPX)
		if (error) throw error

		expect(gpx.extensions).toEqual({
			whitespaceOnly: { '@id': 3 },
			numericText: { '@unit': 'bpm', '#text': 140 },
			emptyAttr: { '@value': '' },
		})
	})

	test('collects repeated sibling elements into an array', () => {
		const [gpx, error] = parse(REPEATED_SIBLINGS_GPX)
		if (error) throw error

		expect(gpx.extensions).toEqual({
			'wx:observers': {
				'wx:observer': [
					{ '@wx:badge': 31 },
					{ '@wx:badge': 48 },
					{ '@wx:badge': 52 },
				],
			},
			tag: ['first', 'second'],
			single: 'only',
		})
	})

	test('reads attributes and text at any nesting depth', () => {
		const [gpx, error] = parse(NESTED_EXTENSIONS_GPX)
		if (error) throw error

		expect(gpx.extensions).toEqual({
			'wx:station': {
				'@kind': 'automatic',
				'@wx:sensor': 5,
				'wx:label': {
					'wx:name': {
						'@lang': 'en',
						'@wx:verified': 'true',
						'#text': 'Summit Hut',
					},
					'wx:alt': {
						'@unit': 'm',
						'wx:source': { '@method': 'gps', '#text': 2410 },
					},
				},
			},
		})
	})
})

describe.each(parsers)('extension round-trip ($name)', ({ parse }) => {
	const stringifyAndReparse = (source: string) => {
		const [gpx, error] = parse(source)
		if (error) throw error

		const [xml, stringifyError] = stringifyGPX(gpx, new QsaXMLSerializer())
		if (stringifyError) throw stringifyError

		const doc = new QsaDOMParser().parseFromString(xml, 'text/xml')
		const [reparsed, reparseError] = qsaParse(xml)
		if (reparseError) throw reparseError

		return { gpx, doc, reparsed }
	}

	test('preserves extension attributes and text through stringifyGPX', () => {
		const { gpx, reparsed } = stringifyAndReparse(ATTRIBUTE_EXTENSIONS_GPX)

		expect(reparsed.extensions).toEqual(gpx.extensions)
		expect(reparsed.metadata.extensions).toEqual(gpx.metadata.extensions)
		expect(reparsed.waypoints[0].extensions).toEqual(
			gpx.waypoints[0].extensions
		)
		expect(reparsed.routes[0].extensions).toEqual(gpx.routes[0].extensions)
		expect(reparsed.routes[0].points[1].extensions).toEqual(
			gpx.routes[0].points[1].extensions
		)
	})

	test('preserves repeated sibling elements through stringifyGPX', () => {
		const { gpx, doc, reparsed } = stringifyAndReparse(
			REPEATED_SIBLINGS_GPX
		)

		expect(reparsed.extensions).toEqual(gpx.extensions)
		expect(doc.getElementsByTagNameNS(WEATHER_NS, 'observer')).toHaveLength(
			3
		)
	})

	test('preserves deeply nested extensions through stringifyGPX', () => {
		const { gpx, doc, reparsed } = stringifyAndReparse(
			NESTED_EXTENSIONS_GPX
		)

		expect(reparsed.extensions).toEqual(gpx.extensions)
		const source = doc.getElementsByTagNameNS(WEATHER_NS, 'source')
		expect(source).toHaveLength(1)
		expect(source[0].getAttribute('method')).toBe('gps')
		expect(source[0].textContent).toBe('2410')
	})

	test('writes prefixed elements and attributes in their own namespace, not the GPX one', () => {
		const { doc } = stringifyAndReparse(ATTRIBUTE_EXTENSIONS_GPX)

		const stations = doc.getElementsByTagNameNS(WEATHER_NS, 'station')
		expect(stations).toHaveLength(1)
		expect(stations[0].getAttributeNS(WEATHER_NS, 'sensor')).toBe('5')
		// Unprefixed attributes are in no namespace, per the XML spec.
		expect(stations[0].getAttribute('kind')).toBe('automatic')

		expect(doc.getElementsByTagNameNS(WEATHER_NS, 'label')).toHaveLength(1)
		expect(doc.getElementsByTagNameNS(WEATHER_NS, 'observer')).toHaveLength(
			1
		)
		expect(doc.getElementsByTagNameNS(WEATHER_NS, 'sensor')).toHaveLength(1)
		expect(doc.getElementsByTagNameNS(WEATHER_NS, 'reading')).toHaveLength(
			1
		)
	})

	test('preserves a namespace declared inline on the extension element', () => {
		const { gpx, doc, reparsed } = stringifyAndReparse(INLINE_NAMESPACE_GPX)

		const extensions = doc.getElementsByTagNameNS(
			GARMIN_TPX_NS,
			'TrackPointExtension'
		)
		expect(extensions).toHaveLength(1)
		expect(doc.getElementsByTagNameNS(GARMIN_TPX_NS, 'hr')).toHaveLength(1)
		expect(reparsed.tracks[0].points[0].extensions).toEqual(
			gpx.tracks[0].points[0].extensions
		)
	})
})
