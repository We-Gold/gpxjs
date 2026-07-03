// This file runs under the "node" vitest project (see vite.config.js), using
// xmldom-qsa rather than a real browser DOM. Unlike a browser Element,
// xmldom-qsa's Element has no `innerHTML` getter at all, so an empty element
// falls all the way through `getElementValue`'s fallback chain to `null`
// instead of stopping at an empty string. That third fallback isn't
// reachable from the browser project, so it's covered here instead.

import { expect, test } from 'vitest'
import { DOMParser } from 'xmldom-qsa'

import { readObject, scalar } from '../../lib/xml_object_mapping'

test('an empty element with no innerHTML support reads as null', () => {
	const doc = new DOMParser().parseFromString(
		'<root><name></name></root>',
		'text/xml'
	)

	const read: any = {}
	readObject(
		{ name: scalar() },
		doc.documentElement as unknown as Element,
		read
	)
	expect(read).toStrictEqual({ name: null })
})
