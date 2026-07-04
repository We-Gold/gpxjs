![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/We-Gold/gpxjs/main?label=npm%20version&color=green&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@we-gold/gpxjs)
![npm bundle size](https://img.shields.io/bundlephobia/min/@we-gold/gpxjs?color=green)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/We-Gold/gpxjs/issues)
![ViewCount](https://views.whatilearened.today/views/github/We-Gold/gpxjs.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
![NPM Downloads](https://img.shields.io/npm/dw/@we-gold/gpxjs)
![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/We-Gold/gpxjs/main/badges/coverage.json)

# GPX.JS

Based on [GPXParser.js](https://github.com/Luuka/GPXParser.js), which has been unmaintained, this updated library is intended to bring modern JavaScript features to GPX parsing, including extensions in tracks and fully featured typescript support.

_I'm also open to any improvements or suggestions with the library, so feel free to leave an issue ([Contributing](#contribution))._

> [!WARNING]
> **Upgrading from 1.1.0 or earlier?** 1.2.0 includes four breaking changes (`link` fields are now arrays, `stringifyGPX`/`applyToTrack`/`applyToRoute` return `[result, error]` tuples instead of throwing, and `metadata.time` is now a `Date`). See [Migrating to 1.2.0](./docs/migration-1.2.0.md) before upgrading.


## GPX Schema

The schema for GPX, a commonly used gps tracking format, can be found here: [GPX 1.1](https://www.topografix.com/gpx.asp).

See [Documentation](#documentation) for more details on how GPX data is represented by the library.

## Documentation

The [`docs/`](./docs) folder holds longer-form guides that don't belong inline here, including:

- [Migrating to 1.2.0](./docs/migration-1.2.0.md) — breaking and additive changes in the 1.2.0 release.

For the shape of the parsed output, see [Types](#types) below and [types.ts](./lib/types.ts).

## Usage

**This library does include support for non-browser execution.**

Right now, to use this in Node.js without a browser or in something like React Native, use [`xmldom-qsa`](https://www.npmjs.com/package/xmldom-qsa) instead.

See instructions below on [how to use a custom DOM parser](#using-a-custom-dom-parser).

### Install using NPM

`npm i @we-gold/gpxjs`

Then, import the `parseGPX` method:

```js
import { parseGPX } from "@we-gold/gpxjs"

const [parsedFile, error] = parseGPX(myXMLGPXString)

// Or use a try catch to verify
if (error) throw error

const geojson = parsedFile.toGeoJSON()
```

### Include JavaScript File

In an HTML document:

```html
<script src="./src/gpxjs.js"></script>

<script type="module">
	import { parseGPX } from "@we-gold/gpxjs"

	const [parsedFile, error] = parseGPX(myXMLGPXString)

	// Or use a try catch to verify
	if (error) throw error

	const geojson = parsedFile.toGeoJSON()
</script>
```

### Fetching a GPX File

While this feature isn't included, it is fairly simple to fetch a GPX file and format it as a string.

```js
import { parseGPX } from "@we-gold/gpxjs"

fetch("./somefile.gpx")
	.then((response) => {
		if (!response.ok) {
			throw new Error("Failed to fetch the file")
		}
		return response.text()
	})
	.then((data) => {
		const [parsedFile, error] = parseGPX(data)

		// Or use a try catch to verify
		if (error) throw error

		const geojson = parsedFile.toGeoJSON()
	})
```

_`parseGPX` has an additional optional argument `removeEmptyFields` which removes empty or null values from the output. It is true by default. This argument is also available in `parseGPXWithCustomParser`._

### Use the Parsed GPX

```js
const totalDistance = gpx.tracks[0].distance.total

const extensions = gpx.tracks[1].extensions
```

### Use parsedGPX functions

```js
/// export to GPX
const geoJSON = parsedGPX.toGeoJSON()


/// stringify GPX function
import { stringifyGPX } from "@we-gold/gpxjs"

const [xmlAsString, stringifyError] = stringifyGPX(parsedGPX);
if (stringifyError) throw stringifyError;

// math functions
import { calculateDistance, calculateDuration, calculateElevation, calculateSlopes } from "@we-gold/gpxjs"

/// recalculates the distance, duration, elevation, and slopes of the track
const [dist, distError] = parsedGPX.applyToTrack(0, calculateDistance);
if (distError) throw distError;
const [dur] = parsedGPX.applyToTrack(0, calculateDuration);
const [elev] = parsedGPX.applyToTrack(0, calculateElevation);
const [slope] = parsedGPX.applyToTrack(0, calculateSlopes, dist.cumulative)
```

_`applyToTrack`/`applyToRoute` return a `[result, error]` tuple, the same convention as `parseGPX`: `error` is set if the track/route index is out of bounds or the supplied function throws, in which case `result` is `null`._

### Using a Custom DOM Parser

If working in an environment where a custom DOM Parser is required, you can include it like so:

_Note, this is significantly slower than using the browser parser._

```js
import { parseGPXWithCustomParser, stringifyGPX} from "@we-gold/gpxjs"
import { DOMParser, XMLSerializer } from "xmldom-qsa"

const customParseMethod = (txt: string): Document | null => {
	return new DOMParser().parseFromString(txt, "text/xml")
}

const [parsedFile, error] = parseGPXWithCustomParser(
	myXMLGPXString,
	customParseMethod
)

const [xml, stringifyError] = stringifyGPX(parsedFile, new XMLSerializer());
if (stringifyError) throw stringifyError;
```

# Contribution

If you are having an issue and aren't sure how to resolve it, feel free to leave an issue.

If you do know how to fix it, please leave a PR, as I cannot guarantee how soon I can address the issue myself.

I do try to be responsive to PRs though, so if you leave one I'll try to get it merged asap.

Also, there are some basic tests built in to the library, so please test your code before you try to get it merged (_just to make sure everything is backwards compatible_). Use `npm run test` to do this.

You will need _playwright_ installed to run the tests. Use `npx playwright install` to install it. Follow any additional instructions given by the installer to ensure it works on your operating system.

If your change might affect performance, run `npm run bench` before and after to compare. It benchmarks `parseGPX`/`parseGPXWithCustomParser` and `toGeoJSON` separately, for both the browser DOMParser path and the non-browser xmldom-qsa path, since they perform quite differently.

## Benchmarks

<!-- BENCHMARKS:START -->
_Last updated 2026-07-04 by `npm run bench:update-readme`, normally run in CI on push to `main`. Shared CI hardware is noisy, so treat these as a rough trend rather than a precise number; run `npm run bench` locally to compare branches on the same machine._

| Environment | Operation | Mean time | Ops/sec |
| --- | --- | --- | --- |
| Node (xmldom-qsa) | parseGPXWithCustomParser: parses a 10000-point track | 157.79 ms | 6.34 (±11.71%) |
| Node (xmldom-qsa) | toGeoJSON: converts a 10000-point track | 0.445 ms | 2,248 (±1.44%) |
| Browser (DOMParser) | parseGPX: parses a 10000-point track | 116.91 ms | 8.55 (±3.81%) |
| Browser (DOMParser) | toGeoJSON: converts a 10000-point track | 0.561 ms | 1,783 (±3.20%) |
<!-- BENCHMARKS:END -->

## Options

You can also run `parseGPX()` with custom options for more control over the parsing process. See [options.ts](./lib/options.ts) for more details.

```js
const [parsedFile, error] = parseGPX(data, {
    avgSpeedThreshold: 0.1,
})
// same for parseGPXWithCustomParser()
```

| Property          | Type    | Description                                                             |
| ----------------- | ------- | ----------------------------------------------------------------------- |
| removeEmptyFields | boolean | delete null fields in output                                            |
| avgSpeedThreshold | number  | average speed threshold (in m/ms) used to determine the moving duration |

## Types

These descriptions are adapted from [GPXParser.js](https://github.com/Luuka/GPXParser.js), with minor modifications.

For specific type definition, see [types.ts](./lib/types.ts).

| Property   | Type               | Description                                       |
| ---------- | ------------------ | -------------------------------------------------- |
| xml        | XML Document       | XML Document parsed from GPX string                |
| metadata   | Metadata object    | File metadata                                      |
| waypoints  | Array of Waypoints | Array of waypoints                                 |
| tracks     | Array of Tracks    | Array of waypoints of tracks                       |
| routes     | Array of Routes    | Array of waypoints of routes                       |
| extensions | Object             | Arbitrary extra data from the root `<extensions>`  |
| version    | String             | The `version` attribute of the root `<gpx>` element |
| creator    | String             | The `creator` attribute of the root `<gpx>` element |

### Metadata

| Property    | Type             | Description                               |
| ----------- | ---------------- | ------------------------------------------ |
| name        | String           | File name                                 |
| description | String           | Description                               |
| link        | Array of Links   | Web addresses                             |
| author      | Author object    | Author object                             |
| time        | Date             | Time                                      |
| copyright   | Copyright object | Copyright holder and license              |
| keywords    | String           | Comma-separated list of keywords          |
| bounds      | Bounds object    | Minimum and maximum coordinates covered   |
| extensions  | Object           | Arbitrary extra data from `<extensions>`  |

### Waypoint

| Property          | Type           | Description                                        |
| ----------------- | -------------- | --------------------------------------------------- |
| name              | String         | Point name                                          |
| comment           | String         | Comment                                             |
| description       | String         | Point description                                   |
| latitude          | Float          | Point latitude                                      |
| longitude         | Float          | Point longitude                                     |
| elevation         | Float          | Point elevation                                     |
| time              | Date           | Point time                                          |
| magneticVariation | Float          | Magnetic variation at the point                     |
| geoidHeight       | Float          | Height of the geoid above the WGS84 ellipsoid       |
| src               | String         | Source device                                       |
| link              | Array of Links | Web addresses                                       |
| type              | String         | Waypoint classification                             |
| fix               | String         | GPS fix type: `none`, `2d`, `3d`, `dgps`, or `pps`  |
| satellites        | Integer        | Number of satellites used to calculate the fix      |
| hdop              | Float          | Horizontal dilution of precision                    |
| vdop              | Float          | Vertical dilution of precision                      |
| pdop              | Float          | Position dilution of precision                      |
| ageOfDgpsData     | Float          | Seconds since the last DGPS update                  |
| dgpsId            | Integer        | ID of the DGPS station used                         |
| extensions        | Object         | Arbitrary extra data from `<extensions>`            |

### Track

| Property          | Type             | Description                                           |
| ----------------- | ---------------- | ------------------------------------------------------ |
| name              | String           | Point name                                             |
| comment           | String           | Comment                                                |
| description       | String           | Point description                                      |
| src               | String           | Source device                                          |
| number            | String           | Track identifier                                       |
| link              | Array of Links   | Web addresses                                          |
| type              | String           | Track type                                             |
| points            | Array            | Array of Points                                        |
| distance          | Distance Object  | Distance information about the Track                   |
| duration          | Duration Object  | Duration information about the Track                   |
| elevation         | Elevation Object | Elevation information about the Track                  |
| slopes            | Float Array      | Slope of each sub-segment                              |
| extensions        | Object           | Arbitrary extra data from `<trk>`'s `<extensions>`     |
| segmentExtensions | Object           | Arbitrary extra data from `<trkseg>`'s `<extensions>`  |

### Route

| Property    | Type             | Description                              |
| ----------- | ---------------- | ------------------------------------------ |
| name        | String           | Point name                               |
| comment     | String           | Comment                                  |
| description | String           | Point description                        |
| src         | String           | Source device                            |
| number      | String           | Track identifier                         |
| link        | Array of Links   | Web addresses                            |
| type        | String           | Route type                               |
| points      | Array            | Array of Points                          |
| distance    | Distance Object  | Distance information about the Route     |
| duration    | Duration Object  | Duration information about the Route     |
| elevation   | Elevation Object | Elevation information about the Route    |
| slopes      | Float Array      | Slope of each sub-segment                |
| extensions  | Object           | Arbitrary extra data from `<extensions>` |

### Point

The GPX 1.1 XSD defines `<trkpt>`/`<rtept>` as the same element type as a standalone `<wpt>`, so `Point` (a track/route point) has the exact same fields as [Waypoint](#waypoint) above.

### Distance

| Property   | Type  | Description                                          |
| ---------- | ----- | ---------------------------------------------------- |
| total      | Float | Total distance of the Route/Track                    |
| cumulative | Float | Cumulative distance at each point of the Route/Track |

### Duration

| Property       | Type         | Description                                          |
| -------------- | ------------ | ---------------------------------------------------- |
| cumulative     | Float        | Cumulative duration at each point of the Route/Track |
| movingDuration | Float        | Total moving duration of the Route/Track in seconds  |
| totalDuration  | Float        | Total duration of the Route/Track in seconds         |
| startTime      | Date or null | Start date, if available                             |
| endTime        | Date or null | End date, if available                               |

### Elevation

| Property | Type  | Description                   |
| -------- | ----- | ----------------------------- |
| maximum  | Float | Maximum elevation             |
| minimum  | Float | Minimum elevation             |
| positive | Float | Positive elevation difference |
| negative | Float | Negative elevation difference |
| average  | Float | Average elevation             |

### Author

| Property | Type         | Description                 |
| -------- | ------------ | --------------------------- |
| name     | String       | Author name                 |
| email    | Email object | Email address of the author |
| link     | Link object  | Web address                 |

### Email

| Property | Type   | Description  |
| -------- | ------ | ------------ |
| id       | String | Email id     |
| domain   | String | Email domain |

### Link

| Property | Type   | Description |
| -------- | ------ | ----------- |
| href     | String | Web address |
| text     | String | Link text   |
| type     | String | Link type   |

### Copyright

| Property | Type   | Description                            |
| -------- | ------ | --------------------------------------- |
| author   | String | Copyright holder                        |
| year     | String | Copyright year                          |
| license  | String | License URI                             |

### Bounds

| Property     | Type  | Description                    |
| ------------ | ----- | ------------------------------- |
| minLatitude  | Float | Minimum latitude of the file   |
| minLongitude | Float | Minimum longitude of the file  |
| maxLatitude  | Float | Maximum latitude of the file   |
| maxLongitude | Float | Maximum longitude of the file  |
