// This file runs under the "node" vitest project (see vite.config.js),
// a real Node environment with no `window` or `document` globals. That
// lets it actually exercise parseGPX's non-browser guard clause, instead
// of only simulating the absence of a browser DOM.
import { afterEach, expect, test, vi } from 'vitest'
import { DOMParser } from 'xmldom-qsa'

import { parseGPX, parseGPXWithCustomParser } from '../../lib/index'
import { testGPXFile } from '../test-gpx-file'

afterEach(() => {
	vi.unstubAllGlobals()
})

test('parseGPX fails gracefully outside a browser environment', () => {
	expect(typeof document).toBe('undefined')

	const [parsedGPX, error] = parseGPX(testGPXFile)

	expect(parsedGPX).toBeNull()
	expect(error).toBeInstanceOf(Error)
	expect(error?.message).toBe('Provided parsing method failed.')
})

test('parseGPX logs and fails when document exists but window does not', () => {
	// A real browser always has both, and plain Node has neither; this
	// covers the in-between case some non-browser DOM shims can produce.
	vi.stubGlobal('document', {})
	expect(typeof window).toBe('undefined')
	const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

	const [parsedGPX, error] = parseGPX(testGPXFile)

	expect(parsedGPX).toBeNull()
	expect(error).toBeInstanceOf(Error)
	expect(consoleError).toHaveBeenCalledWith(
		'window is undefined, try to use the parseGPXWithCustomParser method'
	)
})

test('parseGPXWithCustomParser preserves repeated extension tags as arrays', () => {
	const source = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test Creator"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:mtbx="http://std.mtb.cafe/0.0/mtbx">
  <metadata>
    <extensions>
      <mtbx:contributors>
        <mtbx:user mtbx:id="0"/>
        <mtbx:user mtbx:id="1"/>
      </mtbx:contributors>
    </extensions>
  </metadata>
</gpx>`

	const [parsed, error] = parseGPXWithCustomParser(
		source,
		(txt) => new DOMParser().parseFromString(txt, 'text/xml')
	)

	if (error) throw error
	expect(parsed.metadata.extensions).toStrictEqual({
		'mtbx:contributors': {
			'mtbx:user': [
				{ '@mtbx:id': '0' },
				{ '@mtbx:id': '1' },
			],
		},
	})
})
