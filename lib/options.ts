export const DEFAULT_THRESHOLD = 0.000215 // m/ms - 0.215 m/s - 0.774000 km/h

export const DEFAULT_OPTIONS = {
	// delete null fields in output
	removeEmptyFields: true,
	// average speed threshold (in m/ms) used to determine the moving duration
	avgSpeedThreshold: DEFAULT_THRESHOLD,
}
