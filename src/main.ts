import { parseGPX } from "../lib"

fetch("./src/test_files/test.gpx")
	.then((response) => {
		if (!response.ok) {
			throw new Error("Failed to fetch the file")
		}
		return response.text()
	})
	.then((textData) => {
		let startTime = performance.now()

		// Parse the test file
		const parsedGPX = parseGPX(textData)

		let endTime = performance.now()
		console.log("Execution time:", endTime - startTime, "ms")
		console.log(parsedGPX)

		startTime = performance.now()

		const GeoJSON = parsedGPX.toGeoJSON()

		endTime = performance.now()
		console.log("Execution time:", endTime - startTime, "ms")
		console.log(GeoJSON)
	})
	.catch((error) => {
		console.error("Error:", error)
	})
