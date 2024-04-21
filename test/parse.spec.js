import { expect, test, assertType } from "vitest"

import { DOMParser } from "xmldom-qsa"
import { parseGPX, parseGPXWithCustomParser } from "../lib/index"

import { testGPXFile, expectedMetadata, expectedWaypoint, expectedRoute, expectedTrack } from "./test-gpx-file"

// TODO test GeoJSON, benchmarks

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
    expect(expectedMetadata).toStrictEqual(parsedGPX.metadata)  

    // Test waypoint data
    const waypoint = parsedGPX.waypoints[0]

    expect(waypoint).not.toBeNull()
    expect(waypoint).toStrictEqual(expectedWaypoint)  

    // Test track information
    const track = parsedGPX.tracks[0]

    expect(track).not.toBeNull()
    expect(track).toStrictEqual(expectedTrack)  
    
    // Test route information
    const route = parsedGPX.routes[0]

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
    expect(expectedMetadata).toStrictEqual(parsedGPX.metadata)  

    // Test waypoint data
    const waypoint = parsedGPX.waypoints[0]

    expect(waypoint).not.toBeNull()
    expect(waypoint).toStrictEqual(expectedWaypoint)  

    // Test track information
    const track = parsedGPX.tracks[0]

    expect(track).not.toBeNull()
    expect(track).toStrictEqual(expectedTrack)  
    
    // Test route information
    const route = parsedGPX.routes[0]

    expect(route).not.toBeNull()
    expect(route).toStrictEqual(expectedRoute)  
})