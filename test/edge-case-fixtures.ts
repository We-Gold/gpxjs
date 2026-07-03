// GPX fixtures for edge cases that the main test-gpx-file.ts fixture doesn't
// cover: empty input, malformed XML, missing required attributes, points
// missing optional fields, and tracks/routes with no points.

export const emptyGPXFile = `<?xml version="1.0" encoding="UTF-8" ?>
<gpx version="1.1" creator="Test Creator"></gpx>`

// Neither the browser's DOMParser nor xmldom-qsa throw on invalid XML; they
// log a warning/error and hand back a document that has no queryable GPX
// content. Note that the exact recovery behavior for XML that is *partially*
// well-formed (e.g. a tag that's just missing its closing tag) differs
// between the two parsers, so this fixture is deliberately garbage from the
// first character. That keeps the expected result the same for both parsers
// and independent of either library's specific recovery heuristics.
export const invalidXMLInput = 'this is not xml at all <<<'

export const missingLatLonGPXFile = `<?xml version="1.0" encoding="UTF-8" ?>
<gpx version="1.1" creator="Test Creator">
    <wpt>
        <name>No Coordinates</name>
    </wpt>
</gpx>`

export const noTimeNoElevationGPXFile = `<?xml version="1.0" encoding="UTF-8" ?>
<gpx version="1.1" creator="Test Creator">
    <wpt lat="47.253146555709" lon="-1.5153741828293">
        <name>No Time Or Elevation</name>
    </wpt>
</gpx>`

export const zeroPointsGPXFile = `<?xml version="1.0" encoding="UTF-8" ?>
<gpx version="1.1" creator="Test Creator">
    <trk>
        <name>Empty Track</name>
    </trk>
    <rte>
        <name>Empty Route</name>
    </rte>
</gpx>`

// Three timed track points, roughly 100 meters apart, one second apart each.
// Used to exercise calculateDuration's moving-vs-resting logic with
// different avgSpeedThreshold values.
export const timedTrackGPXFile = `<?xml version="1.0" encoding="UTF-8" ?>
<gpx version="1.1" creator="Test Creator">
    <trk>
        <name>Timed Track</name>
        <trkseg>
            <trkpt lat="45.0" lon="-1.0">
                <time>2020-01-01T00:00:00Z</time>
            </trkpt>
            <trkpt lat="45.0009" lon="-1.0">
                <time>2020-01-01T00:00:01Z</time>
            </trkpt>
            <trkpt lat="45.0018" lon="-1.0">
                <time>2020-01-01T00:00:02Z</time>
            </trkpt>
        </trkseg>
    </trk>
</gpx>`
