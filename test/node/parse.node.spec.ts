// This file runs under the "node" vitest project (see vite.config.js),
// a real Node environment with no `window` or `document` globals. That
// lets it actually exercise parseGPX's non-browser guard clause, instead
// of only simulating the absence of a browser DOM.
import { expect, test } from 'vitest'

import { parseGPX } from '../../lib/index'
import { testGPXFile } from '../test-gpx-file'

test('parseGPX fails gracefully outside a browser environment', () => {
	expect(typeof document).toBe('undefined')

	const [parsedGPX, error] = parseGPX(testGPXFile)

	expect(parsedGPX).toBeNull()
	expect(error).toBeInstanceOf(Error)
	expect(error?.message).toBe('Provided parsing method failed.')
})
