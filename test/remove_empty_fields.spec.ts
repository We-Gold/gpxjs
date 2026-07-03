import { describe, expect, test } from 'vitest'

import { removeEmptyFields } from '../lib/remove_empty_fields'

describe('removeEmptyFields', () => {
	test('returns primitives, null, and undefined unchanged', () => {
		expect(removeEmptyFields('a')).toBe('a')
		expect(removeEmptyFields(1)).toBe(1)
		expect(removeEmptyFields(true)).toBe(true)
		expect(removeEmptyFields(null)).toBeNull()
		expect(removeEmptyFields(undefined)).toBeUndefined()
	})

	test('omits object keys whose value is null or undefined', () => {
		const result = removeEmptyFields({ a: 1, b: null, c: undefined, d: 0 })

		expect(result).toStrictEqual({ a: 1, d: 0 })
		expect('b' in result).toBe(false)
		expect('c' in result).toBe(false)
	})

	test('keeps falsy-but-not-nullish values (0, false, empty string)', () => {
		const result = removeEmptyFields({ a: 0, b: false, c: '' })

		expect(result).toStrictEqual({ a: 0, b: false, c: '' })
	})

	test('recurses into nested objects', () => {
		const result = removeEmptyFields({
			a: { b: 1, c: null },
			d: null,
		})

		expect(result).toStrictEqual({ a: { b: 1 } })
	})

	test('recurses into array elements without dropping array entries', () => {
		const result = removeEmptyFields([{ a: 1, b: null }, null, { a: 2 }])

		expect(result).toStrictEqual([{ a: 1 }, null, { a: 2 }])
	})

	test('does not mutate the original value', () => {
		const original = { a: 1, b: null as null | number }
		const result = removeEmptyFields(original)

		expect(original).toStrictEqual({ a: 1, b: null })
		expect(result).not.toBe(original)
		expect(result).toStrictEqual({ a: 1 })
	})

	test('passes Date instances through unchanged, rather than reducing them to {}', () => {
		const date = new Date('2020-01-01T00:00:00.000Z')
		const result = removeEmptyFields({ time: date, missing: null })

		expect(result).toStrictEqual({ time: date })
		expect(result.time).toBeInstanceOf(Date)
		expect(result.time).toBe(date)
	})
})
