/**
 * Builds a synthetic GPX track with `pointCount` trackpoints, for
 * benchmarking against something long enough to show real differences
 * between runs. The real sample files under `src/test_files` aren't usable
 * here since the larger ones are gitignored (they contain the maintainer's
 * personal location history); this generates an equivalent shape instead.
 */
export function generateTrackGPX(pointCount: number): string {
	const points: string[] = []

	let lat = 40.262287
	let lon = -76.657546
	let ele = 150
	const start = new Date('2020-04-01T18:24:06Z').getTime()

	for (let i = 0; i < pointCount; i++) {
		// Small, deterministic per-step drift, just enough to make each
		// point distinct rather than a straight line or a repeat.
		lat += 0.00001 * Math.sin(i / 37)
		lon += 0.00001 * Math.cos(i / 53)
		ele += Math.sin(i / 21)
		const time = new Date(start + i * 1000).toISOString()

		points.push(
			`<trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}">` +
				`<ele>${ele.toFixed(2)}</ele>` +
				`<time>${time}</time>` +
				'<extensions>' +
				`<speed>${(1 + Math.sin(i / 10)).toFixed(4)}</speed>` +
				`<course>${(i % 360).toFixed(2)}</course>` +
				'</extensions>' +
				'</trkpt>'
		)
	}

	return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="gpxjs benchmark" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <time>2020-04-01T18:24:06Z</time>
  </metadata>
  <trk>
    <name>Generated benchmark track</name>
    <trkseg>
      ${points.join('\n      ')}
    </trkseg>
  </trk>
</gpx>`
}
