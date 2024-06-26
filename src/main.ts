import { parseGPX, parseGPXWithCustomParser } from "../lib"
import { DOMParser } from "xmldom-qsa"

fetch("./src/test_files/test.gpx")
	.then((response) => {
		if (!response.ok) {
			throw new Error("Failed to fetch the file")
		}
		return response.text()
	})
	.then((textData) => {
		testBrowserParser(textData)
		testNonBrowserParser(textData)
	})
	.catch((error) => {
		console.error("Error:", error)
	})

const testBrowserParser = (textData: string) => {
	console.log("\nBROWSER MODE")
	let startTime = performance.now()

	const [parsedGPX, error] = parseGPX(textData)

	// Verify that the parsing was successful
	if (error) throw error

	let endTime = performance.now()
	console.log("Execution time:", endTime - startTime, "ms")
	console.log(parsedGPX)

	startTime = performance.now()

	const GeoJSON = parsedGPX.toGeoJSON()

	endTime = performance.now()
	console.log("Execution time:", endTime - startTime, "ms")
	console.log(GeoJSON)
}

const testNonBrowserParser = (textData: string) => {
	console.log("\nNONBROWSER MODE")
	let startTime = performance.now()

	const [parsedGPX, error] = parseGPXWithCustomParser(
		textData,
		(txt: string): Document | null =>
			new DOMParser().parseFromString(txt, "text/xml")
	)

	// Verify that the parsing was successful
	if (error) throw error

	let endTime = performance.now()
	console.log("Execution time:", endTime - startTime, "ms")
	console.log(parsedGPX)

	startTime = performance.now()

	const GeoJSON = parsedGPX.toGeoJSON()

	endTime = performance.now()
	console.log("Execution time:", endTime - startTime, "ms")
	console.log(GeoJSON)
}
