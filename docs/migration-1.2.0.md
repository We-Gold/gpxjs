# Migrating to 1.2.0

Version 1.2.0 brings the parsed output in line with the full GPX 1.1 schema
(issues #29, #34, #35) and makes the serialize/apply APIs return errors instead
of throwing them (the same `[result, error]` convention `parseGPX` already
uses). Most of the change is additive: fields the library used to drop are now
parsed. There are three breaking changes to be aware of, described first.

## At a glance

| Change | Kind | Action needed |
| ------ | ---- | ------------- |
| `link` fields are now `Link[]` instead of `Link \| null` | Breaking | Update reads of `.link` |
| `stringifyGPX` returns a `[xml, error]` tuple instead of a `string` | Breaking | Destructure the result |
| `applyToTrack` / `applyToRoute` return a `[result, error]` tuple and no longer throw | Breaking | Destructure the result, check `error` |
| `Point` is now an alias for `Waypoint` | Additive | None, more fields available |
| New fields on `MetaData`, `Waypoint`, `Track`, `Route` | Additive | None |
| `ParsedGPX` gained `version`, `creator`, root `extensions` | Additive | None |

## Breaking: `link` fields are now arrays

The GPX schema allows more than one `<link>` on metadata, waypoints, tracks,
and routes. Previously the library kept only a single `Link | null`; now these
fields are `Link[]`, so every link in the source is preserved.

Affected fields:

- `gpx.metadata.link`
- `waypoint.link` (on entries of `gpx.waypoints`)
- `track.link` (on entries of `gpx.tracks`)
- `route.link` (on entries of `gpx.routes`)

Update any code that reads a link directly to index into the array:

```ts
// Before (1.1.x)
const href = gpx.metadata.link?.href
const text = gpx.tracks[0].link?.text

// After (1.2.0)
const href = gpx.metadata.link[0]?.href
const text = gpx.tracks[0].link[0]?.text
```

The array is always present (never `null`); it is empty when the source has no
`<link>`, so `link[0]?.href` is the safe way to read the first one.

This also affects GeoJSON output: the `link` property on a feature can now be a
`Link[]` rather than a single `Link`, since it is copied straight from the
track/route/waypoint.

### One exception: `Author.link` stays singular

The schema only allows a single `<link>` on an author, so
`gpx.metadata.author.link` remains `Link | null` and does not change:

```ts
// Unchanged in 1.2.0
const authorSite = gpx.metadata.author?.link?.href
```

## Breaking: `stringifyGPX` returns a tuple

`stringifyGPX` used to return the XML string directly (and throw if
serialization failed). It now returns a `[xml, error]` tuple, matching
`parseGPX`: on success `error` is `null`, and on failure `xml` is `null` and
`error` holds the thrown value.

```ts
// Before (1.1.x)
const xml = stringifyGPX(gpx)

// After (1.2.0)
const [xml, error] = stringifyGPX(gpx)
if (error) throw error
// use xml
```

A custom serializer is still passed as the optional second argument:
`stringifyGPX(gpx, new XMLSerializer())`.

## Breaking: `applyToTrack` / `applyToRoute` return a tuple

These methods used to return the function's result directly, throw on error,
and return `undefined` (after logging to the console) when the index was out of
bounds. They now return a `[result, error]` tuple and never throw: `error` is
set when the track/route index is out of bounds or the supplied function
throws, in which case `result` is `null`.

```ts
// Before (1.1.x)
const distance = gpx.applyToTrack(0, calculateDistance)

// After (1.2.0)
const [distance, error] = gpx.applyToTrack(0, calculateDistance)
if (error) throw error
// use distance
```

When you are chaining results, destructure each one:

```ts
const [dist] = gpx.applyToTrack(0, calculateDistance)
const [slopes] = gpx.applyToTrack(0, calculateSlopes, dist.cumulative)
```

## Additive: `Point` is now `Waypoint`

Track and route points (`<trkpt>` and `<rtept>`) are the same element type as a
standalone `<wpt>` in the GPX schema, so `Point` is now an alias for `Waypoint`.
Points used to expose only a handful of fields (`latitude`, `longitude`,
`elevation`, `time`, `extensions`); they now carry the full waypoint field set.

This is backward compatible. Existing code keeps working, and more fields are
now available on each point:

```ts
const point = gpx.tracks[0].points[0]

// Worked before and still works
point.latitude
point.longitude
point.elevation

// Now also available on track/route points
point.name
point.symbol
point.hdop
point.satellites
// ...and the rest of the waypoint fields
```

## Additive: new fields on parsed types

The full-schema work added fields that the parser previously discarded. All of
these are additive, so no existing code needs to change to keep working.

- `MetaData` gained `copyright`, `keywords`, `bounds`, and `extensions`.
- `Waypoint` (and therefore `Point`) gained `magneticVariation`, `geoidHeight`,
  `src`, `type`, `fix`, `satellites`, `hdop`, `vdop`, `pdop`, `ageOfDgpsData`,
  `dgpsId`, and `extensions`. `fix` is typed as
  `WaypointFix = 'none' | '2d' | '3d' | 'dgps' | 'pps'`.
- `Track` and `Route` gained `extensions`. `Track` also gained
  `segmentExtensions`, holding extensions from the `<trkseg>` element(s). A
  `<trk>` can have more than one `<trkseg>`, but `points` is a flat array with
  no notion of segment boundaries, so only the first `<trkseg>` that carries an
  `<extensions>` is reflected there; every segment's points are still included
  in `points`.

## Additive: new fields on `ParsedGPX`

The root `<gpx>` element's own data is now parsed:

- `gpx.version` — the `version` attribute, e.g. `"1.1"`
- `gpx.creator` — the `creator` attribute, e.g. `"Garmin Connect"`
- `gpx.extensions` — arbitrary data from a root-level `<extensions>` element

```ts
const [gpx, error] = parseGPX(xml)
if (error) throw error

gpx.version // "1.1"
gpx.creator // "Garmin Connect"
gpx.extensions // { ... } or null
```

Related: `stringifyGPX` now writes these back out. If the parsed GPX has a
`version` or `creator`, they are preserved on a round trip; otherwise it falls
back to `version="1.1"` and `creator="gpxjs"` as before.

## Summary

Three changes require action when upgrading from 1.1.x:

1. Read `link` fields as arrays (`link[0]?.href`).
2. Destructure `stringifyGPX`'s `[xml, error]` result.
3. Destructure `applyToTrack` / `applyToRoute`'s `[result, error]` result.

Everything else is additive and safe to adopt incrementally.

## Type reference: what changed

The blocks below show each affected type as a diff from 1.1.x. Lines in red
were removed or changed out, lines in green are new in 1.2.0.

### MetaData

```diff
 type MetaData = {
 	name: string | null
 	description: string | null
-	link: Link | null
+	link: Link[]
 	author: Author | null
 	time: string | null
+	copyright: Copyright | null
+	keywords: string | null
+	bounds: Bounds | null
+	extensions: Extensions | null
 }
```

### Waypoint

```diff
 type Waypoint = {
 	name: string | null
 	symbol: string | null
 	comment: string | null
 	description: string | null
 	latitude: number
 	longitude: number
 	elevation: number | null
 	time: Date | null
+	magneticVariation: number | null
+	geoidHeight: number | null
+	src: string | null
+	link: Link[]
+	type: string | null
+	fix: WaypointFix | null
+	satellites: number | null
+	hdop: number | null
+	vdop: number | null
+	pdop: number | null
+	ageOfDgpsData: number | null
+	dgpsId: number | null
+	extensions: Extensions | null
 }
```

### Track

```diff
 type Track = {
 	name: string | null
 	comment: string | null
 	description: string | null
 	src: string | null
 	number: string | null
-	link: Link | null
+	link: Link[]
 	type: string | null
 	points: Point[]
 	distance: Distance
 	duration: Duration
 	elevation: Elevation
 	slopes: number[]
+	extensions: Extensions | null
+	segmentExtensions: Extensions | null
 }
```

### Route

```diff
 type Route = {
 	name: string | null
 	comment: string | null
 	description: string | null
 	src: string | null
 	number: string | null
-	link: Link | null
+	link: Link[]
 	type: string | null
 	points: Point[]
 	distance: Distance
 	elevation: Elevation
 	duration: Duration
 	slopes: number[]
+	extensions: Extensions | null
 }
```

### Point

```diff
-type Point = {
-	latitude: number
-	longitude: number
-	elevation: number | null
-	time: Date | null
-	extensions: Extensions | null
-}
+// Point is now an alias for Waypoint (the full wptType field set)
+type Point = Waypoint
```

### ParsedGPX

```diff
 class ParsedGPX {
 	xml: Document
 	metadata: MetaData
 	waypoints: Waypoint[]
 	tracks: Track[]
 	routes: Route[]
+	extensions: Extensions | null
+	version: string | null
+	creator: string | null
 }
```

### New types

```diff
+type WaypointFix = 'none' | '2d' | '3d' | 'dgps' | 'pps'
+
+type Copyright = {
+	author: string | null
+	year: string | null
+	license: string | null
+}
+
+type Bounds = {
+	minLatitude: number | null
+	minLongitude: number | null
+	maxLatitude: number | null
+	maxLongitude: number | null
+}
```
