import { expect, test, assertType } from "vitest"

import { parseGPX } from "../lib/index"

import { testGPXFile } from "./test-gpx-file"

// TODO test GeoJSON, benchmarks, non-browser

// TODO: Noted inconsistencies while testing
// Missing some metadata information
// Parse some times as dates and some as strings
// Some items match abbreviations, some don't

// TODO test based on some object rather than manually entering fields

test("Parsing returns expected result", () => {
	const [parsedGPX, error] = parseGPX(testGPXFile)

	// Verify that the parsing was successful
	if (error) throw error

    assertType<XMLDocument>(parsedGPX.xml)

    // Test metadata from test file
    expect(parsedGPX.metadata.name).toBe("GPX Test")
    expect(parsedGPX.metadata.description).toBe("Test Description")
    expect(parsedGPX.metadata.time).toBe("2020-01-12T21:32:52")
    // TODO fix non-author link parsing
    // expect(parsedGPX.metadata.link.href).toBe("https://test2.com")
    // expect(parsedGPX.metadata.link.text).toBe("General Website")
    // expect(parsedGPX.metadata.link.type).toBe("Web") 

    // Test author metadata
    expect(parsedGPX.metadata.author.name).toBe("Test Author")
    expect(parsedGPX.metadata.author.email.id).toBe("test")
    expect(parsedGPX.metadata.author.email.domain).toBe("test.com")
    expect(parsedGPX.metadata.author.link.href).toBe("https://test.com")
    expect(parsedGPX.metadata.author.link.text).toBe("Author Website")
    expect(parsedGPX.metadata.author.link.type).toBe("Web")

    // Test waypoint data
    const waypoint = parsedGPX.waypoints[0]

    expect(waypoint).not.toBeNull()
    expect(waypoint.name).toBe("Porte de Carquefou")
    expect(waypoint.symbol).toBe("")
    expect(waypoint.latitude).toBeCloseTo(47.253146555709)
    expect(waypoint.longitude).toBeCloseTo(-1.5153741828293)
    expect(waypoint.elevation).toBeCloseTo(35)
    expect(waypoint.comment).toBe("Warning")
    expect(waypoint.description).toBe("Route")
    expect(waypoint.time).toEqual(new Date("2020-02-02T07:54:30.000Z"))    

    // Test track information
    const track = parsedGPX.tracks[0]

    expect(track).not.toBeNull()
    expect(track.name).toBe("Track")
    expect(track.comment).toBe("Bridge")
    expect(track.description).toBe("Test track")
    expect(track.src).toBe("GPX Test")
    expect(track.number).toBe("1")
    expect(track.type).toBe("Web")
    expect(track.link.href).toBe("https://test.com")
    expect(track.link.text).toBe("Author Website")
    expect(track.link.type).toBe("Web")

    // Test track point information
    const point = track.points[0]

    expect(point).not.toBeNull()
    expect(point.latitude).toBeCloseTo(47.2278526991611)
    expect(point.longitude).toBeCloseTo(-1.5521714646550901)
    expect(point.elevation).toBeCloseTo(12.36)
    expect(point.time).toEqual(new Date("2020-02-02T07:54:30.000Z"))    
    // expect(point.extensions.strext).toBe("testString")    
    expect(point.extensions.intext).toBe(3)    
    expect(point.extensions.floatext).toBe(1.75)    
    // expect(point.extensions.subtext.subval).toBeCloseTo(33)    

    // Test route information
    console.log(parsedGPX.routes)

    const route = parsedGPX.routes[0]

    expect(route).not.toBeNull()
    expect(route.name).toBe("Track")
    expect(route.comment).toBe("Bridge")
    expect(route.description).toBe("Test track")
    expect(route.src).toBe("GPX Test")
    expect(route.number).toBe("1")
    expect(route.type).toBe("Web")
    expect(route.link.href).toBe("https://test.com")
    expect(route.link.text).toBe("Author Website")
    expect(route.link.type).toBe("Web")

    const routePoint = route.points[0]

    expect(routePoint).not.toBeNull()
    expect(routePoint.latitude).toBeCloseTo(47.2278526991611)
    expect(routePoint.longitude).toBeCloseTo(-1.5521714646550901)
    expect(routePoint.elevation).toBeCloseTo(12.36)
    expect(routePoint.time).toEqual(new Date("2020-02-02T07:54:30.000Z"))    
})