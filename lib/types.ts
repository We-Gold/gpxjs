export type MetaData = {
	name: string | null
	description: string | null
	link: Link[]
	author: Author | null
	time: string | null
	copyright: Copyright | null
	keywords: string | null
	bounds: Bounds | null
	extensions: Extensions | null
}

/** GPS fix quality, as reported by a device for a waypoint/track/route point. */
export type WaypointFix = 'none' | '2d' | '3d' | 'dgps' | 'pps'

export type Waypoint = {
	name: string | null
	symbol: string | null
	comment: string | null
	description: string | null
	latitude: number
	longitude: number
	elevation: number | null
	time: Date | null
	magneticVariation: number | null
	geoidHeight: number | null
	src: string | null
	link: Link[]
	type: string | null
	fix: WaypointFix | null
	satellites: number | null
	hdop: number | null
	vdop: number | null
	pdop: number | null
	ageOfDgpsData: number | null
	dgpsId: number | null
	extensions: Extensions | null
}

export type Track = {
	name: string | null
	comment: string | null
	description: string | null
	src: string | null
	number: string | null
	link: Link[]
	type: string | null
	points: Point[]
	distance: Distance
	duration: Duration
	elevation: Elevation
	slopes: number[]
	extensions: Extensions | null
	/**
	 * Extensions from the track's `<trkseg>` element(s), kept separate from
	 * the track's own `<trk>`-level `extensions` above since the schema
	 * allows both. A `<trk>` can have more than one `<trkseg>`, but `points`
	 * is a flat array with no notion of segment boundaries, so only the
	 * first `<trkseg>` that has an `<extensions>` element is reflected here;
	 * every `<trkseg>`'s points are still included in `points`.
	 */
	segmentExtensions: Extensions | null
}

export type Route = {
	name: string | null
	comment: string | null
	description: string | null
	src: string | null
	number: string | null
	link: Link[]
	type: string | null
	points: Point[]
	distance: Distance
	elevation: Elevation
	duration: Duration
	slopes: number[]
	extensions: Extensions | null
}

/**
 * A `<trkpt>`/`<rtept>`. The GPX 1.1 XSD defines these as literally the same
 * element type as a standalone `<wpt>` (`wptType`), so `Point` and
 * `Waypoint` are the same shape here too, rather than `Point` only exposing
 * a handful of the fields a track/route point can legally carry.
 */
export type Point = Waypoint

export type Distance = {
	total: number
	cumulative: number[]
}

export type Duration = {
	cumulative: number[]
	movingDuration: number
	totalDuration: number
	startTime: Date | null
	endTime: Date | null
}

export type Elevation = {
	maximum: number | null
	minimum: number | null
	positive: number | null
	negative: number | null
	average: number | null
}

export type Author = {
	name: string | null
	email: Email | null
	link: Link | null
}

export type Email = {
	id: string | null
	domain: string | null
}

export type Link = {
	href: string | null
	text: string | null
	type: string | null
}

export type Copyright = {
	author: string | null
	year: string | null
	license: string | null
}

export type Bounds = {
	minLatitude: number | null
	minLongitude: number | null
	maxLatitude: number | null
	maxLongitude: number | null
}

export type ParsedGPXInputs = {
	xml: Document
	metadata: MetaData
	waypoints: Waypoint[]
	tracks: Track[]
	routes: Route[]
	/** Extensions on the root `<gpx>` element itself, as opposed to any of its children. */
	extensions: Extensions | null
	/** The `version` attribute of the root `<gpx>` element, e.g. `"1.1"`. */
	version: string | null
	/** The `creator` attribute of the root `<gpx>` element, e.g. `"Garmin Connect"`. */
	creator: string | null
}

export type Feature = {
	type: string
	geometry: {
		type: string
		coordinates: (number | null)[][]
	}
	properties: {
		[key: string]: string | number | Link | Link[] | null
	}
}

export type WaypointFeature = {
	type: string
	geometry: {
		type: string
		coordinates: (number | null)[]
	}
	properties: {
		[key: string]: string | number | Link | Link[] | null
	}
}

export type GeoJSON = {
	type: string
	features: (Feature | WaypointFeature)[]
	properties: MetaData
}

export type Extensions = {
	[key: string]: string | number | Extensions
}

export type Options = {
	removeEmptyFields: boolean
	avgSpeedThreshold: number
}
