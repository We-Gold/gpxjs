import { expect, test, assertType } from "vitest"

import { DOMParser } from "xmldom-qsa"
import { parseGPX, parseGPXWithCustomParser } from "../lib/index"

import { testGPXFile } from "./test-gpx-file"

// TODO test GeoJSON, benchmarks, non-browser

// TODO: Noted inconsistencies while testing
// Missing some metadata information
// Parse some times as dates and some as strings
// Some items match abbreviations, some don't

test("Default parsing returns expected result", () => {
	const [parsedGPX, error] = parseGPX(testGPXFile)

	// Verify that the parsing was successful
	if (error) throw error

    assertType<XMLDocument>(parsedGPX.xml)

    // Test metadata from test file
    const expectedMetadata = {
        name: "GPX Test",
        description: "Test Description",
        time: "2020-01-12T21:32:52",
        link: {
            href: "https://test2.com",
            text: "General Website",
            type: "Web"
        },
        author: {
            name: "Test Author",
            email: {
                id: "test",
                domain: "test.com",
            },
            link: {
                href: "https://test.com",
                text: "Author Website",
                type: "Web"
            }
        },
    }

    expect(expectedMetadata).toStrictEqual(parsedGPX.metadata)  

    // Test waypoint data
    const waypoint = parsedGPX.waypoints[0]

    const expectedWaypoint = {
        name: "Porte de Carquefou",
        symbol: "",
        latitude: 47.253146555709,
        longitude: -1.5153741828293,
        elevation: 35,
        comment: "Warning",
        description: "Route",
        time: new Date("2020-02-02T07:54:30.000Z")
    }

    expect(waypoint).not.toBeNull()
    expect(waypoint).toStrictEqual(expectedWaypoint)  

    // Test track information
    const track = parsedGPX.tracks[0]

    const expectedTrack = {
        name: "Track",
        comment: "Bridge",
        description: "Test track",
        src: "GPX Test Device",
        number: "1",
        type: "MTB",
        link: {
            href: "https://test.com",
            text: "Track Website",
            type: "Web"
        },
        distance: {
            cumulative: [0],
            total: 0,
        },
        elevation: {
            average: 12.36,
            maximum: 12.36,
            minimum: 12.36,
            positive: null, // TODO is this correct?
            negative: null,
        },
        points: [
            {
                elevation: 12.36,
                extensions: {
                    floatext: 1.75,
                    intext: 3,
                    strext: "testString",
                    subext: {
                        subval: 33
                    },
                },
                latitude: 47.2278526991611,
                longitude: -1.5521714646550901,
                time: new Date("2020-02-02T07:54:30.000Z"),
            }
        ],
        slopes: [],
    }

    expect(track).not.toBeNull()
    expect(track).toStrictEqual(expectedTrack)  
    
    // Test route information
    const route = parsedGPX.routes[0]

    const expectedRoute = {
        name: "Track",
        comment: "Bridge",
        description: "Test route",
        src: "GPX Test Device",
        number: "1",
        type: "MTB",
        link: {
            href: "https://test.com",
            text: "Route Website",
            type: "Web"
        },
        distance: {
            cumulative: [0],
            total: 0,
        },
        elevation: {
            average: 12.36,
            maximum: 12.36,
            minimum: 12.36,
            positive: null, // TODO is this correct?
            negative: null,
        },
        points: [
            {
                latitude: 47.2278526991611,
                longitude: -1.5521714646550901,
                elevation: 12.36,
                time: new Date("2020-02-02T07:54:30.000Z"),
                extensions: null,
            },
        ],
        slopes: [],
    }

    expect(route).not.toBeNull()
    expect(route).toStrictEqual(expectedRoute)  
})

test("Non-browser parsing returns expected result", () => {
    const customParseMethod = (txt)=> {
        return new DOMParser().parseFromString(txt, "text/xml")
    }

    const [parsedGPX, error] = parseGPXWithCustomParser(
        testGPXFile,
        customParseMethod
    )

	// Verify that the parsing was successful
	if (error) throw error

    assertType<XMLDocument>(parsedGPX.xml)

    // Test metadata from test file
    const expectedMetadata = {
        name: "GPX Test",
        description: "Test Description",
        time: "2020-01-12T21:32:52",
        link: {
            href: "https://test2.com",
            text: "General Website",
            type: "Web"
        },
        author: {
            name: "Test Author",
            email: {
                id: "test",
                domain: "test.com",
            },
            link: {
                href: "https://test.com",
                text: "Author Website",
                type: "Web"
            }
        },
    }

    expect(expectedMetadata).toStrictEqual(parsedGPX.metadata)  

    // Test waypoint data
    const waypoint = parsedGPX.waypoints[0]

    const expectedWaypoint = {
        name: "Porte de Carquefou",
        symbol: "",
        latitude: 47.253146555709,
        longitude: -1.5153741828293,
        elevation: 35,
        comment: "Warning",
        description: "Route",
        time: new Date("2020-02-02T07:54:30.000Z")
    }

    expect(waypoint).not.toBeNull()
    expect(waypoint).toStrictEqual(expectedWaypoint)  

    // Test track information
    const track = parsedGPX.tracks[0]

    const expectedTrack = {
        name: "Track",
        comment: "Bridge",
        description: "Test track",
        src: "GPX Test Device",
        number: "1",
        type: "MTB",
        link: {
            href: "https://test.com",
            text: "Track Website",
            type: "Web"
        },
        distance: {
            cumulative: [0],
            total: 0,
        },
        elevation: {
            average: 12.36,
            maximum: 12.36,
            minimum: 12.36,
            positive: null, // TODO is this correct?
            negative: null,
        },
        points: [
            {
                elevation: 12.36,
                extensions: {
                    floatext: 1.75,
                    intext: 3,
                    strext: "testString",
                    subext: {
                        subval: 33
                    },
                },
                latitude: 47.2278526991611,
                longitude: -1.5521714646550901,
                time: new Date("2020-02-02T07:54:30.000Z"),
            }
        ],
        slopes: [],
    }

    expect(track).not.toBeNull()
    expect(track).toStrictEqual(expectedTrack)  
    
    // Test route information
    const route = parsedGPX.routes[0]

    const expectedRoute = {
        name: "Track",
        comment: "Bridge",
        description: "Test route",
        src: "GPX Test Device",
        number: "1",
        type: "MTB",
        link: {
            href: "https://test.com",
            text: "Route Website",
            type: "Web"
        },
        distance: {
            cumulative: [0],
            total: 0,
        },
        elevation: {
            average: 12.36,
            maximum: 12.36,
            minimum: 12.36,
            positive: null, // TODO is this correct?
            negative: null,
        },
        points: [
            {
                latitude: 47.2278526991611,
                longitude: -1.5521714646550901,
                elevation: 12.36,
                time: new Date("2020-02-02T07:54:30.000Z"),
                extensions: null,
            },
        ],
        slopes: [],
    }

    expect(route).not.toBeNull()
    expect(route).toStrictEqual(expectedRoute)  
})