import type { MetaData, Point, Route, Track, Waypoint } from '../lib/types'

// These fixtures only cover the fields that survive parsing with default
// options (see the comment on expectedMetadata below). This helper marks
// the nested object fields as partial too, since Partial<T> alone only
// applies one level deep.
type ExpectedTrackOrRoute = Partial<
	Omit<Track | Route, 'distance' | 'duration' | 'elevation' | 'points'>
> & {
	distance?: Partial<Track['distance']>
	duration?: Partial<Track['duration']>
	elevation?: Partial<Track['elevation']>
	points?: Partial<Point>[]
}

export const testGPXFile = `<?xml version="1.0" encoding="UTF-8" ?>
<gpx version="1.1" creator="Test Creator">
    <metadata>
        <name>GPX Test</name>
        <desc>Test Description</desc>
        <author>
            <name>Test Author</name>
            <email id="test" domain="test.com"></email>
            <link href="https://test.com">
                <text>Author Website</text>
                <type>Web</type>
            </link>
        </author>
        <copyright author="Test Copyright Owner">
            <year>2024</year>
            <license>MIT</license>
        </copyright>
        <link href="https://test2.com">
            <text>General Website</text>
            <type>Web</type>
        </link>
        <time>2020-01-12T21:32:52</time>
        <keywords>Test, gpx, file</keywords>
        <bounds minlat="49.12965660728301" minlon="-1.5521714646550901" maxlat="45.85097922514941"
                maxlon="4.336738935765406"></bounds>
    </metadata>
    <wpt lat="47.253146555709" lon="-1.5153741828293">
        <name>Porte de Carquefou</name>
        <desc>Route</desc>
        <ele>35</ele>
        <time>2020-02-02T07:54:30Z</time>
        <cmt>Warning</cmt>
    </wpt>
    <wpt lat="47.235331031612" lon="-1.5482325613225">
        <name>Pont de la Tortière</name>
        <desc>Route</desc>
        <ele>20</ele>
        <time>2020-02-02T07:54:30Z</time>
        <cmt>Bridge</cmt>
    </wpt>
    <trk>
        <name>Track</name>
        <cmt>Bridge</cmt>
        <desc>Test track</desc>
        <src>GPX Test Device</src>
        <number>1</number>
        <link href="https://test.com">
            <text>Track Website</text>
            <type>Web</type>
        </link>
        <type>MTB</type>
        <trkseg>
            <trkpt lat="47.2278526991611" lon="-1.5521714646550901">
                <ele>12.36</ele>
                <time>2020-02-02T07:54:30Z</time>
                <extensions>
                    <strext>testString</strext>
                    <intext>3</intext>
                    <floatext>1.75</floatext>
                    <subext>
                        <subval>33.0</subval>
                    </subext>
                </extensions>
            </trkpt>
        </trkseg>
    </trk>
    <rte>
        <name>Track</name>
        <cmt>Bridge</cmt>
        <desc>Test route</desc>
        <src>GPX Test Device</src>
        <number>1</number>
        <link href="https://test.com">
            <text>Route Website</text>
            <type>Web</type>
        </link>
        <type>MTB</type>
        <rtept lat="47.2278526991611" lon="-1.5521714646550901">
            <ele>12.36</ele>
            <time>2020-02-02T07:54:30Z</time>
        </rtept>
    </rte>
</gpx>`

// Fields are omitted here because the default `removeEmptyFields` option
// strips null values from the parsed output, so these fixtures only cover
// the fields that survive parsing with default options.
export const expectedMetadata: Partial<MetaData> = {
	name: 'GPX Test',
	description: 'Test Description',
	time: '2020-01-12T21:32:52',
	link: [
		{
			href: 'https://test2.com',
			text: 'General Website',
			type: 'Web',
		},
	],
	author: {
		name: 'Test Author',
		email: {
			id: 'test',
			domain: 'test.com',
		},
		link: {
			href: 'https://test.com',
			text: 'Author Website',
			type: 'Web',
		},
	},
	copyright: {
		author: 'Test Copyright Owner',
		year: '2024',
		license: 'MIT',
	},
	keywords: 'Test, gpx, file',
	bounds: {
		minLatitude: 49.12965660728301,
		minLongitude: -1.5521714646550901,
		maxLatitude: 45.85097922514941,
		maxLongitude: 4.336738935765406,
	},
}

export const expectedWaypoint: Partial<Waypoint> = {
	name: 'Porte de Carquefou',
	latitude: 47.253146555709,
	longitude: -1.5153741828293,
	elevation: 35,
	comment: 'Warning',
	description: 'Route',
	time: new Date('2020-02-02T07:54:30.000Z'),
	link: [],
}

export const expectedTrack: ExpectedTrackOrRoute = {
	name: 'Track',
	comment: 'Bridge',
	description: 'Test track',
	src: 'GPX Test Device',
	number: '1',
	type: 'MTB',
	link: [
		{
			href: 'https://test.com',
			text: 'Track Website',
			type: 'Web',
		},
	],
	distance: {
		cumulative: [0],
		total: 0,
	},
	duration: {
		cumulative: [0],
		movingDuration: 0,
		totalDuration: 0,
	},
	elevation: {
		average: 12.36,
		maximum: 12.36,
		minimum: 12.36,
	},
	points: [
		{
			elevation: 12.36,
			extensions: {
				floatext: 1.75,
				intext: 3,
				strext: 'testString',
				subext: {
					subval: 33,
				},
			},
			latitude: 47.2278526991611,
			longitude: -1.5521714646550901,
			time: new Date('2020-02-02T07:54:30.000Z'),
		},
	],
	slopes: [],
}

export const expectedRoute: ExpectedTrackOrRoute = {
	name: 'Track',
	comment: 'Bridge',
	description: 'Test route',
	src: 'GPX Test Device',
	number: '1',
	type: 'MTB',
	link: [
		{
			href: 'https://test.com',
			text: 'Route Website',
			type: 'Web',
		},
	],
	distance: {
		cumulative: [0],
		total: 0,
	},
	duration: {
		cumulative: [0],
		movingDuration: 0,
		totalDuration: 0,
	},
	elevation: {
		average: 12.36,
		maximum: 12.36,
		minimum: 12.36,
	},
	points: [
		{
			latitude: 47.2278526991611,
			longitude: -1.5521714646550901,
			elevation: 12.36,
			time: new Date('2020-02-02T07:54:30.000Z'),
		},
	],
	slopes: [],
}
