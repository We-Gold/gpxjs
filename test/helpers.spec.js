import { test } from "vitest"

import { parseGPX, calculateDistance, calculateDuration, calculateElevation, calculateSlopes } from "../lib/index"

import { testGPXFile } from "./test-gpx-file"

test("All applied functions produce outputs without errors.", () => {
    const [parsedGPX, error] = parseGPX(testGPXFile)

    // Verify that the parsing was successful
    if (error) throw error

    // Apply all functions to the first track
    const tdist = parsedGPX.applyToTrack(0, calculateDistance)
    parsedGPX.applyToTrack(0, calculateDuration)
    parsedGPX.applyToTrack(0, calculateElevation)
    parsedGPX.applyToTrack(0, calculateSlopes, tdist.cumulative)

    // Apply all functions to the first route
    const rdist = parsedGPX.applyToRoute(0, calculateDistance)
    parsedGPX.applyToRoute(0, calculateDuration)
    parsedGPX.applyToRoute(0, calculateElevation)
    parsedGPX.applyToRoute(0, calculateSlopes, rdist.cumulative)
})