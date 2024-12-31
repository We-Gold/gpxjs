![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/We-Gold/gpxjs/main?label=npm%20version&color=green&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@we-gold/gpxjs)
![npm bundle size](https://img.shields.io/bundlephobia/min/@we-gold/gpxjs?color=green)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/We-Gold/gpxjs/issues)
![ViewCount](https://views.whatilearened.today/views/github/We-Gold/gpxjs.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
![NPM Downloads](https://img.shields.io/npm/dw/@we-gold/gpxjs)

# GPX.JS

Based on [GPXParser.js](https://github.com/Luuka/GPXParser.js), which has been unmaintained, this updated library is intended to bring modern JavaScript features to GPX parsing, including extensions in tracks and fully featured typescript support.

_I'm also open to any improvements or suggestions with the library, so feel free to leave an issue ([Contributing](#contribution))._

## GPX Schema

The schema for GPX, a commonly used gps tracking format, can be found here: [GPX 1.1](https://www.topografix.com/gpx.asp).

See [Documentation](#documentation) for more details on how GPX data is represented by the library.

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

const xmlAsString = stringifyGPX(parsedGPX);

// math functions
import { calculateDistance, calculateDuration, calculateElevation, calculateSlopes } from "@we-gold/gpxjs"

/// recalculates the distance, duration, elevation, and slopes of the track
const dist = parsedGPX.applyToTrack(0, calculateDistance);
const dur = parsedGPX.applyToTrack(0, calculateDuration);
const elev = parsedGPX.applyToTrack(0, calculateElevation);
const slope = parsedGPX.applyToTrack(0, calculateSlopes, dist.cumulative)
```

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

const xml = stringifyGPX(parsedFile, new XMLSerializer());
```

# Contribution

If you are having an issue and aren't sure how to resolve it, feel free to leave an issue.

If you do know how to fix it, please leave a PR, as I cannot guarantee how soon I can address the issue myself.

I do try to be responsive to PRs though, so if you leave one I'll try to get it merged asap.

Also, there are some basic tests built in to the library, so please test your code before you try to get it merged (_just to make sure everything is backwards compatible_). Use `npm run test` to do this.

You will need _playwright_ installed to run the tests. Use `npx playwright install` to install it. Follow any additional instructions given by the installer to ensure it works on your operating system.

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

| Property  | Type               | Description                         |
| --------- | ------------------ | ----------------------------------- |
| xml       | XML Document       | XML Document parsed from GPX string |
| metadata  | Metadata object    | File metadata                       |
| waypoints | Array of Waypoints | Array of waypoints                  |
| tracks    | Array of Tracks    | Array of waypoints of tracks        |
| routes    | Array of Routes    | Array of waypoints of routes        |

### Metadata

| Property    | Type        | Description   |
| ----------- | ----------- | ------------- |
| name        | String      | File name     |
| description | String      | Description   |
| link        | Link object | Web address   |
| author      | Float       | Author object |
| time        | String      | Time          |

### Waypoint

| Property    | Type   | Description       |
| ----------- | ------ | ----------------- |
| name        | String | Point name        |
| comment     | String | Comment           |
| description | String | Point description |
| latitude    | Float  | Point latitute    |
| longitude   | Float  | Point longitude   |
| elevation   | Float  | Point elevation   |
| time        | Date   | Point time        |

### Track

| Property    | Type             | Description                           |
| ----------- | ---------------- | ------------------------------------- |
| name        | String           | Point name                            |
| comment     | String           | Comment                               |
| description | String           | Point description                     |
| src         | String           | Source device                         |
| number      | String           | Track identifier                      |
| link        | String           | Link to a web address                 |
| type        | String           | Track type                            |
| points      | Array            | Array of Points                       |
| distance    | Distance Object  | Distance information about the Track  |
| duration    | Duration Object  | Duration information about the Track  |
| elevation   | Elevation Object | Elevation information about the Track |
| slopes      | Float Array      | Slope of each sub-segment             |

### Route

| Property    | Type             | Description                           |
| ----------- | ---------------- | ------------------------------------- |
| name        | String           | Point name                            |
| comment     | String           | Comment                               |
| description | String           | Point description                     |
| src         | String           | Source device                         |
| number      | String           | Track identifier                      |
| link        | String           | Link to a web address                 |
| type        | String           | Route type                            |
| points      | Array            | Array of Points                       |
| distance    | Distance Object  | Distance information about the Route  |
| duration    | Duration Object  | Duration information about the Route  |
| elevation   | Elevation Object | Elevation information about the Route |
| slopes      | Float Array      | Slope of each sub-segment             |

### Point

| Property  | Type  | Description     |
| --------- | ----- | --------------- |
| latitude  | Float | Point latitute  |
| longitude | Float | Point longitude |
| elevation | Float | Point elevation |
| time      | Date  | Point time      |

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
