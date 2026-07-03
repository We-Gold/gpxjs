import { describe, expect, test } from 'vitest'

import {
	DOMParser as QsaDOMParser,
	XMLSerializer as QsaXMLSerializer,
} from 'xmldom-qsa'
import { parseGPX, parseGPXWithCustomParser } from '../lib/index'
import { stringifyGPX } from '../lib/stringify'

// Covers the GPX 1.1 XSD fields that #29 found missing from GPX_MAPPING:
// extensions at levels other than points, multiple <link> elements, and
// most of wptType. See the comment on Track['segmentExtensions'] in
// types.ts for why <trk> and <trkseg> extensions are kept as two fields
// instead of one.
const SCHEMA_COVERAGE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test Creator">
    <metadata>
        <name>Schema Coverage</name>
        <link href="https://one.example.com"><text>One</text><type>Web</type></link>
        <link href="https://two.example.com"><text>Two</text><type>Web</type></link>
        <extensions><metaExt>meta-value</metaExt></extensions>
    </metadata>
    <wpt lat="1.1" lon="2.2">
        <name>Full Waypoint</name>
        <ele>10</ele>
        <time>2020-01-01T00:00:00Z</time>
        <magvar>1.5</magvar>
        <geoidheight>12.3</geoidheight>
        <src>Test GPS</src>
        <link href="https://wpt-one.example.com"><text>Wpt One</text><type>Web</type></link>
        <link href="https://wpt-two.example.com"><text>Wpt Two</text><type>Web</type></link>
        <type>Landmark</type>
        <fix>3d</fix>
        <sat>7</sat>
        <hdop>0.9</hdop>
        <vdop>1.1</vdop>
        <pdop>1.4</pdop>
        <ageofdgpsdata>5</ageofdgpsdata>
        <dgpsid>12</dgpsid>
        <extensions><wptExt>wpt-value</wptExt></extensions>
    </wpt>
    <trk>
        <name>Full Track</name>
        <link href="https://trk-one.example.com"><text>Trk One</text><type>Web</type></link>
        <link href="https://trk-two.example.com"><text>Trk Two</text><type>Web</type></link>
        <extensions><trkExt>trk-value</trkExt></extensions>
        <trkseg>
            <extensions><segExt>seg-value</segExt></extensions>
            <trkpt lat="1.0" lon="2.0"><ele>5</ele><time>2020-01-01T00:00:00Z</time></trkpt>
        </trkseg>
    </trk>
    <rte>
        <name>Full Route</name>
        <link href="https://rte-one.example.com"><text>Rte One</text><type>Web</type></link>
        <link href="https://rte-two.example.com"><text>Rte Two</text><type>Web</type></link>
        <extensions><rteExt>rte-value</rteExt></extensions>
        <rtept lat="1.0" lon="2.0"><ele>5</ele><time>2020-01-01T00:00:00Z</time></rtept>
    </rte>
    <extensions><gpxExt>gpx-value</gpxExt></extensions>
</gpx>`

const parsers = [
	{ name: 'browser', parse: parseGPX },
	{
		name: 'non-browser (xmldom-qsa)',
		parse: (source: string) =>
			parseGPXWithCustomParser(source, (txt) =>
				new QsaDOMParser().parseFromString(txt, 'text/xml')
			),
	},
]

describe.each(parsers)('full schema coverage ($name)', ({ parse }) => {
	test('parses extensions at every level, multiple links, and the full wptType field set', () => {
		const [gpx, error] = parse(SCHEMA_COVERAGE_GPX)
		if (error) throw error

		expect(gpx.extensions).toEqual({ gpxExt: 'gpx-value' })

		expect(gpx.metadata.link).toEqual([
			{ href: 'https://one.example.com', text: 'One', type: 'Web' },
			{ href: 'https://two.example.com', text: 'Two', type: 'Web' },
		])
		expect(gpx.metadata.extensions).toEqual({ metaExt: 'meta-value' })

		const waypoint = gpx.waypoints[0]
		expect(waypoint.magneticVariation).toBe(1.5)
		expect(waypoint.geoidHeight).toBe(12.3)
		expect(waypoint.src).toBe('Test GPS')
		expect(waypoint.link).toEqual([
			{
				href: 'https://wpt-one.example.com',
				text: 'Wpt One',
				type: 'Web',
			},
			{
				href: 'https://wpt-two.example.com',
				text: 'Wpt Two',
				type: 'Web',
			},
		])
		expect(waypoint.type).toBe('Landmark')
		expect(waypoint.fix).toBe('3d')
		expect(waypoint.satellites).toBe(7)
		expect(waypoint.hdop).toBe(0.9)
		expect(waypoint.vdop).toBe(1.1)
		expect(waypoint.pdop).toBe(1.4)
		expect(waypoint.ageOfDgpsData).toBe(5)
		expect(waypoint.dgpsId).toBe(12)
		expect(waypoint.extensions).toEqual({ wptExt: 'wpt-value' })

		const track = gpx.tracks[0]
		expect(track.link).toEqual([
			{
				href: 'https://trk-one.example.com',
				text: 'Trk One',
				type: 'Web',
			},
			{
				href: 'https://trk-two.example.com',
				text: 'Trk Two',
				type: 'Web',
			},
		])
		expect(track.extensions).toEqual({ trkExt: 'trk-value' })
		expect(track.segmentExtensions).toEqual({ segExt: 'seg-value' })

		const route = gpx.routes[0]
		expect(route.link).toEqual([
			{
				href: 'https://rte-one.example.com',
				text: 'Rte One',
				type: 'Web',
			},
			{
				href: 'https://rte-two.example.com',
				text: 'Rte Two',
				type: 'Web',
			},
		])
		expect(route.extensions).toEqual({ rteExt: 'rte-value' })
	})

	test('round-trips every new field through stringifyGPX', () => {
		const [gpx, error] = parse(SCHEMA_COVERAGE_GPX)
		if (error) throw error

		const [xml, stringifyError] = stringifyGPX(gpx, new QsaXMLSerializer())
		if (stringifyError) throw stringifyError

		const [reparsed, reparseError] = parseGPXWithCustomParser(xml, (txt) =>
			new QsaDOMParser().parseFromString(txt, 'text/xml')
		)
		if (reparseError) throw reparseError

		expect(reparsed.extensions).toEqual(gpx.extensions)
		expect(reparsed.metadata.link).toEqual(gpx.metadata.link)
		expect(reparsed.metadata.extensions).toEqual(gpx.metadata.extensions)
		expect(reparsed.waypoints[0]).toEqual(gpx.waypoints[0])
		expect(reparsed.tracks[0].link).toEqual(gpx.tracks[0].link)
		expect(reparsed.tracks[0].extensions).toEqual(gpx.tracks[0].extensions)
		expect(reparsed.tracks[0].segmentExtensions).toEqual(
			gpx.tracks[0].segmentExtensions
		)
		expect(reparsed.routes[0].link).toEqual(gpx.routes[0].link)
		expect(reparsed.routes[0].extensions).toEqual(gpx.routes[0].extensions)
	})
})
