// This file runs under the "node" vitest project (see vite.config.js),
// a real Node environment with no `window` or `document` globals. That
// lets it actually exercise parseGPX's non-browser guard clause, instead
// of only simulating the absence of a browser DOM.
import { afterEach, expect, test, vi } from 'vitest'

import { parseGPX } from '../../lib/index'
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
