/**
 * Recursively rebuilds `value`, omitting any object key whose value is
 * `null` or `undefined`. Arrays are cleaned element-by-element but never
 * have entries removed, only pruned; only object keys are dropped.
 *
 * This is a plain function of its input, not a mutation: it returns a new
 * value rather than changing `value` in place. `Date` instances (and other
 * non-plain objects, should any show up in a GPX/GeoJSON value) are passed
 * through as-is rather than rebuilt, since rebuilding one from
 * `Object.entries` would silently turn it into `{}` (a `Date` has no
 * enumerable own properties of its own).
 */
export function removeEmptyFields<T>(value: T): T {
	if (typeof value !== 'object' || value === null || value instanceof Date) {
		return value
	}

	if (Array.isArray(value)) {
		return value.map(removeEmptyFields) as T
	}

	// Build the cleaned object in a single pass. Object.entries().filter().map()
	// + Object.fromEntries() is a more declarative way to write this, but it
	// allocates an entries array, a `[key, value]` pair per field, and two more
	// arrays before rebuilding the object; on a large track this runs once per
	// point and showed up as a real share of parse time.
	const result: Record<string, unknown> = {}
	for (const key of Object.keys(value)) {
		const fieldValue = (value as Record<string, unknown>)[key]
		if (fieldValue != null) result[key] = removeEmptyFields(fieldValue)
	}

	return result as T
}
