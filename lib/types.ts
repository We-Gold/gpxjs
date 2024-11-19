export type MetaData = {
	name: string | null
	description: string | null
	link: Link | null
	author: Author | null
	time: string | null
}

export type Waypoint = {
	name: string | null
	symbol: string | null
	comment: string | null
	description: string | null
	latitude: number
	longitude: number
	elevation: number | null
	time: Date | null
}

export type Track = {
	name: string | null
	comment: string | null
	description: string | null
	src: string | null
	number: string | null
	link: Link | null
	type: string | null
	points: Point[]
	distance: Distance
	duration: Duration
	elevation: Elevation
	slopes: number[]
}

export type Route = {
	name: string | null
	comment: string | null
	description: string | null
	src: string | null
	number: string | null
	link: Link | null
	type: string | null
	points: Point[]
	distance: Distance
	elevation: Elevation
	duration: Duration
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

export type Options = {
	removeEmptyFields: boolean
	avgSpeedThreshold: number
}
