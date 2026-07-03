import { describe, expect, test } from 'vitest'

import {
	array,
	custom,
	object,
	readObject,
	scalar,
	unwrap,
	writeObject,
} from '../lib/xml_object_mapping'

// These tests exercise the mapping engine directly, using small synthetic
// mappings instead of the full GPX schema. That way a bug in how the engine
// handles a particular kind of field (scalar/object/array/custom/unwrap)
// shows up as a precise failure here, rather than as a mysterious mismatch
// somewhere in a full GPX round-trip test.

const NS = 'urn:test'

function parseXml(xml: string): Element {
	const doc = new DOMParser().parseFromString(xml, 'text/xml')
	return doc.documentElement
}

function writeXml(
	mapping: Parameters<typeof writeObject>[2],
	srcObj: Record<string, unknown>
): Element {
	const doc = document.implementation.createDocument(NS, 'root')
	writeObject(doc, NS, mapping, srcObj, doc.documentElement)
	return doc.documentElement
}

describe('scalar fields', () => {
	test('writes and reads an element value', () => {
		const mapping = { name: scalar() }

		const written = writeXml(mapping, { name: 'Alice' })
		expect(written.querySelector('name')?.textContent).toBe('Alice')

		const read: Record<string, unknown> = {}
		readObject(mapping, parseXml('<root><name>Alice</name></root>'), read)
		expect(read).toStrictEqual({ name: 'Alice' })
	})

	test('writes and reads an attribute value', () => {
		const mapping = { '@id': scalar() }

		const written = writeXml(mapping, { id: '42' })
		expect(written.getAttribute('id')).toBe('42')

		const read: Record<string, unknown> = {}
		readObject(mapping, parseXml('<root id="42"/>'), read)
		expect(read).toStrictEqual({ id: '42' })
	})

	test('expr renames the object field independently of the XML name', () => {
		const mapping = { desc: scalar({ expr: 'description' }) }

		const written = writeXml(mapping, { description: 'hello' })
		expect(written.querySelector('desc')?.textContent).toBe('hello')

		const read: Record<string, unknown> = {}
		readObject(mapping, parseXml('<root><desc>hello</desc></root>'), read)
		expect(read).toStrictEqual({ description: 'hello' })
	})

	test('skips writing a field whose value is null or undefined', () => {
		const mapping = { name: scalar(), '@id': scalar() }

		const written = writeXml(mapping, { name: null, id: undefined })
		expect(written.querySelector('name')).toBeNull()
		expect(written.hasAttribute('id')).toBe(false)
	})

	test('a missing element/attribute reads as null by default', () => {
		const mapping = { name: scalar(), '@id': scalar() }

		const read: Record<string, unknown> = {}
		readObject(mapping, parseXml('<root/>'), read)
		expect(read).toStrictEqual({ name: null, id: null })
	})

	describe('$type coercions', () => {
		test('attrString defaults a missing attribute to an empty string', () => {
			const mapping = { '@id': scalar({ type: 'attrString' }) }

			const read: Record<string, unknown> = {}
			readObject(mapping, parseXml('<root/>'), read)
			expect(read).toStrictEqual({ id: '' })
		})

		test('float keeps NaN for an unparseable or missing value', () => {
			const mapping = { '@lat': scalar({ type: 'float' }) }

			const read: Record<string, unknown> = {}
			readObject(mapping, parseXml('<root/>'), read)
			expect(read.lat).toBeNaN()
		})

		test('floatOrNull converts an unparseable or missing value to null', () => {
			const mapping = { ele: scalar({ type: 'floatOrNull' }) }

			const read: Record<string, unknown> = {}
			readObject(
				mapping,
				parseXml('<root><ele>not-a-number</ele></root>'),
				read
			)
			expect(read).toStrictEqual({ ele: null })
		})

		test('date parses a present value and leaves a missing one as null', () => {
			const mapping = { time: scalar({ type: 'date' }) }

			const present: Record<string, unknown> = {}
			readObject(
				mapping,
				parseXml('<root><time>2020-01-01T00:00:00.000Z</time></root>'),
				present
			)
			expect(present.time).toStrictEqual(
				new Date('2020-01-01T00:00:00.000Z')
			)

			const missing: Record<string, unknown> = {}
			readObject(mapping, parseXml('<root/>'), missing)
			expect(missing).toStrictEqual({ time: null })
		})

		test('writing a Date value serializes it as an ISO string', () => {
			const mapping = { time: scalar() }

			const written = writeXml(mapping, {
				time: new Date('2020-01-01T00:00:00.000Z'),
			})
			expect(written.querySelector('time')?.textContent).toBe(
				'2020-01-01T00:00:00.000Z'
			)
		})
	})
})

describe('object fields', () => {
	const mapping = { author: object({ name: scalar() }) }

	test('writes and reads a nested object', () => {
		const written = writeXml(mapping, { author: { name: 'Bob' } })
		expect(written.querySelector('author > name')?.textContent).toBe('Bob')

		const read: Record<string, unknown> = {}
		readObject(
			mapping,
			parseXml('<root><author><name>Bob</name></author></root>'),
			read
		)
		expect(read).toStrictEqual({ author: { name: 'Bob' } })
	})

	test('a missing element defaults to null instead of an empty object', () => {
		const read: Record<string, unknown> = {}
		readObject(mapping, parseXml('<root/>'), read)
		expect(read).toStrictEqual({ author: null })
	})

	test('does not write an element when the source field is null', () => {
		const written = writeXml(mapping, { author: null })
		expect(written.querySelector('author')).toBeNull()
	})
})

describe('array fields', () => {
	const mapping = { item: array({ name: scalar() }, { expr: 'items' }) }

	test('writes one element per array entry', () => {
		const written = writeXml(mapping, {
			items: [{ name: 'a' }, { name: 'b' }],
		})
		const names = Array.from(written.querySelectorAll('item > name')).map(
			(el) => el.textContent
		)
		expect(names).toStrictEqual(['a', 'b'])
	})

	test('reads every matching element into an array, in document order', () => {
		const read: Record<string, unknown> = {}
		readObject(
			mapping,
			parseXml(
				'<root><item><name>a</name></item><item><name>b</name></item></root>'
			),
			read
		)
		expect(read).toStrictEqual({ items: [{ name: 'a' }, { name: 'b' }] })
	})

	test('defaults to an empty array, not null or undefined, when no elements match', () => {
		const read: Record<string, unknown> = {}
		readObject(mapping, parseXml('<root/>'), read)
		expect(read).toStrictEqual({ items: [] })
	})

	test('does not write any elements when the source field is null or undefined', () => {
		expect(
			writeXml(mapping, { items: null }).querySelector('item')
		).toBeNull()
		expect(writeXml(mapping, {}).querySelector('item')).toBeNull()
	})
})

describe('unwrap (self) fields', () => {
	// Mirrors GPX's <trkseg>, which wraps <trkpt> elements but has no data of
	// its own: `points` should live directly on the track object, not on a
	// separate `trkseg` object.
	const mapping = {
		seg: unwrap({
			pt: array({ '@v': scalar({ expr: 'value' }) }, { expr: 'points' }),
		}),
	}

	test('merges the wrapper element fields into the same object', () => {
		const read: Record<string, unknown> = {}
		readObject(
			mapping,
			parseXml('<root><seg><pt v="1"/><pt v="2"/></seg></root>'),
			read
		)
		expect(read).toStrictEqual({ points: [{ value: '1' }, { value: '2' }] })
	})

	test('array fields nested under an absent wrapper still default to []', () => {
		// There's no <seg> element at all here, so the wrapper is never
		// visited, yet `points` must still come out as [] rather than
		// missing entirely.
		const read: Record<string, unknown> = {}
		readObject(mapping, parseXml('<root/>'), read)
		expect(read).toStrictEqual({ points: [] })
	})

	test('writes the wrapper element around the array items', () => {
		const written = writeXml(mapping, { points: [{ value: '1' }] })
		expect(written.querySelector('seg > pt')?.getAttribute('v')).toBe('1')
	})
})

describe('custom fields', () => {
	const mapping = {
		payload: custom(
			(_doc, value: Record<string, string>, dstElem) => {
				for (const key in value) {
					dstElem.setAttribute(key, value[key])
				}
			},
			(srcElem) =>
				Object.fromEntries(
					Array.from(srcElem.attributes).map((attr) => [
						attr.name,
						attr.value,
					])
				)
		),
	}

	test('delegates writing to the write function', () => {
		const written = writeXml(mapping, { payload: { a: '1', b: '2' } })
		const payloadElem = written.querySelector('payload')
		expect(payloadElem?.getAttribute('a')).toBe('1')
		expect(payloadElem?.getAttribute('b')).toBe('2')
	})

	test('delegates reading to the read function', () => {
		const read: Record<string, unknown> = {}
		readObject(
			mapping,
			parseXml('<root><payload a="1" b="2"/></root>'),
			read
		)
		expect(read).toStrictEqual({ payload: { a: '1', b: '2' } })
	})

	test('a missing element defaults to null and skips the read function', () => {
		const read: Record<string, unknown> = {}
		readObject(mapping, parseXml('<root/>'), read)
		expect(read).toStrictEqual({ payload: null })
	})

	test('does not overwrite a value already present on the destination object', () => {
		// initializeDefaults only fills in a default when the field is
		// undefined; a value set before readObject runs should survive.
		const read: Record<string, unknown> = { payload: { existing: true } }
		readObject(mapping, parseXml('<root/>'), read)
		expect(read).toStrictEqual({ payload: { existing: true } })
	})
})

describe('reading an empty element', () => {
	test('falls back to innerHTML (empty string) when there is no text node', () => {
		const mapping = { name: scalar() }

		const read: Record<string, unknown> = {}
		readObject(mapping, parseXml('<root><name></name></root>'), read)
		expect(read).toStrictEqual({ name: '' })
	})
})
