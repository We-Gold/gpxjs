export type MetaData = {
	name: string
	description: string
	link: Link | null
	author: Author | null
	time: string
}

export type Waypoint = {
	name: string
	symbol: string
	comment: string
	description: string
	latitude: number
	longitude: number
	elevation: number | null
	time: Date | null
}

export type Track = {
	name: string
	comment: string
	description: string
	src: string
	number: string
	link: Link | null
	type: string | null
	points: Point[]
	distance: Distance
	elevation: Elevation
	slopes: number[]
}

export type Route = {
	name: string
	comment: string
	description: string
	src: string
	number: string
	link: Link | null
	type: string | null
	points: Point[]
	distance: Distance
	elevation: Elevation
	slopes: number[]
}

export type Point = {
	latitude: number
	longitude: number
	elevation: number | null
	time: Date | null
	extensions: Extensions | null
}

export type Distance = {
	total: number
	cumulative: number[]
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

export type ParsedGPXInputs = {
	xml: Document
	metadata: MetaData
	waypoints: Waypoint[]
	tracks: Track[]
	routes: Route[]
}

export type Feature = {
	type: string
	geometry: {
		type: string
		coordinates: (number | null)[][]
	}
	properties: {
		[key: string]: string | number | Link | null
	}
}

export type WaypointFeature = {
	type: string
	geometry: {
		type: string
		coordinates: (number | null)[]
	}
	properties: {
		[key: string]: string | number | Link | null
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
