/**
 * A generic, declarative, bidirectional mapping between a JS object shape and
 * an XML element structure.
 *
 * The same ObjectMapping value describes both directions: `writeObject`
 * serializes a JS object to XML using it, and `readObject` parses XML back
 * into a JS object using it. Defining the schema once and sharing it between
 * both directions is the whole point, since it's what keeps parsing and
 * stringifying from silently drifting apart from each other.
 *
 * This file has no GPX-specific knowledge. See `gpx_mapping.ts` for the GPX
 * schema itself, built out of the pieces defined here.
 *
 * `srcObj`/`dstObj` are genuinely untyped here: the same read/write code
 * runs against metadata, waypoints, tracks, routes, and points, which are
 * all differently-shaped objects, and fields are accessed dynamically by
 * string key rather than through a fixed interface. `noExplicitAny` is
 * disabled for this file in biome.json rather than laundering the same
 * looseness through `Record<string, unknown>` casts at every access site.
 */

/**
 * Coercions available for scalar fields when parsing XML into an object.
 * Writing never needs these, since the runtime type of a value (number,
 * Date, string) is already known by the time it's serialized.
 *
 * - undefined: use the raw string as-is, or null if missing
 * - 'attrString': like the default, but a missing attribute becomes '' instead of null
 * - 'float': parse as a float, leaving NaN if unparseable (used for required coordinates)
 * - 'floatOrNull': parse as a float, using null instead of NaN if unparseable
 * - 'intOrNull': parse as an integer, using null instead of NaN if unparseable
 * - 'date': convert to a Date, or null if missing
 */
export type FieldType =
	| 'attrString'
	| 'float'
	| 'floatOrNull'
	| 'intOrNull'
	| 'date'

/** A single attribute or text value. */
export type ScalarMapping = {
	kind: 'scalar'
	/** Target object field name. Defaults to the XML tag/attribute name (minus '@'). */
	expr?: string
	/** How to coerce the raw XML string when parsing. Ignored when writing. */
	type?: FieldType
}

/** A nested element mapped to a sub-object (or, if `self` is set, the same object). */
export type ObjectFieldMapping = {
	kind: 'object'
	/** Target object field name. Defaults to the XML tag name. Ignored if `self` is set. */
	expr?: string
	/**
	 * If true, this element's fields are read/written directly onto the same
	 * object as the parent, instead of a separate nested object. Used to
	 * unwrap a level of XML nesting that has no counterpart in the object
	 * shape, e.g. GPX's `<trkseg>`, which just wraps `<trkpt>` elements with
	 * no data of its own. Prefer the `unwrap()` builder over setting this
	 * directly.
	 */
	self?: boolean
	fields: ObjectMapping
}

/** A repeated element mapped to an array. */
export type ArrayFieldMapping = {
	kind: 'array'
	/** Target array field name. Defaults to the XML tag name. */
	expr?: string
	items: ObjectMapping
}

/** An element whose value can't be described declaratively, e.g. GPX's arbitrary `<extensions>`. */
export type CustomFieldMapping = {
	kind: 'custom'
	/** Target object field name. Defaults to the XML tag name. */
	expr?: string
	write: (doc: Document, value: any, dstElem: Element) => void
	read: (srcElem: Element) => any
}

export type FieldMapping =
	| ScalarMapping
	| ObjectFieldMapping
	| ArrayFieldMapping
	| CustomFieldMapping

/**
 * Maps XML tag/attribute names (keys) to how their content is read from or
 * written to the corresponding object field (values). Attribute keys are
 * written as '@attribute_name'; anything else is treated as an element name.
 */
export type ObjectMapping = {
	[xmlName: string]: FieldMapping
}

/****
 * Builders
 *
 * These exist so a schema reads as a small DSL instead of a nest of tagged
 * object literals, and so TypeScript can check that each kind only gets the
 * options that apply to it.
 ****/

export const scalar = (
	opts: { expr?: string; type?: FieldType } = {}
): ScalarMapping => ({ kind: 'scalar', ...opts })

export const object = (
	fields: ObjectMapping,
	opts: { expr?: string } = {}
): ObjectFieldMapping => ({ kind: 'object', fields, ...opts })

/** An object mapping whose fields merge into the parent object. See `ObjectFieldMapping.self`. */
export const unwrap = (fields: ObjectMapping): ObjectFieldMapping => ({
	kind: 'object',
	self: true,
	fields,
})

export const array = (
	items: ObjectMapping,
	opts: { expr?: string } = {}
): ArrayFieldMapping => ({ kind: 'array', items, ...opts })

export const custom = (
	write: CustomFieldMapping['write'],
	read: CustomFieldMapping['read'],
	opts: { expr?: string } = {}
): CustomFieldMapping => ({ kind: 'custom', write, read, ...opts })

/****
 * Writing (object -> XML)
 ****/

/**
 * Generate XML attributes and elements on `dstElem` from `srcObj`, using the
 * given mapping.
 */
export function writeObject(
	doc: Document,
	ns: string,
	mapping: ObjectMapping,
	srcObj: any,
	dstElem: Element
) {
	for (const xmlName in mapping) {
		writeField(doc, ns, xmlName, mapping[xmlName], srcObj, dstElem)
	}
}

function writeField(
	doc: Document,
	ns: string,
	xmlName: string,
	mapping: FieldMapping,
	srcObj: any,
	dstElem: Element
) {
	const { isAttribute, name, targetField } = resolveField(xmlName, mapping)

	switch (mapping.kind) {
		case 'scalar': {
			const value = srcObj[targetField]
			if (value == null) return
			const serialized =
				value instanceof Date ? value.toISOString() : value

			if (isAttribute) {
				dstElem.setAttribute(name, serialized)
			} else {
				const elem = doc.createElementNS(ns, name)
				dstElem.appendChild(elem)
				elem.appendChild(doc.createTextNode(serialized))
			}
			return
		}
		case 'object': {
			const value = mapping.self ? srcObj : srcObj[targetField]
			if (value == null) return

			const elem = doc.createElementNS(ns, name)
			dstElem.appendChild(elem)
			writeObject(doc, ns, mapping.fields, value, elem)
			return
		}
		case 'array': {
			const values = srcObj[targetField]
			if (values == null) return

			for (const value of values) {
				const elem = doc.createElementNS(ns, name)
				dstElem.appendChild(elem)
				writeObject(doc, ns, mapping.items, value, elem)
			}
			return
		}
		case 'custom': {
			const value = srcObj[targetField]
			if (value == null) return

			const elem = doc.createElementNS(ns, name)
			dstElem.appendChild(elem)
			mapping.write(doc, value, elem)
			return
		}
		/* v8 ignore next 2 */
		default:
			assertUnreachable(mapping)
	}
}

/****
 * Reading (XML -> object)
 ****/

/**
 * Read attributes and elements from `srcElem` into `dstObj`, using the given
 * mapping. Any array/nested-object field described by the mapping is given
 * its default value ([] or null) up front, so `dstObj` has the correct shape
 * even where the corresponding XML is missing.
 */
export function readObject(
	mapping: ObjectMapping,
	srcElem: Element,
	dstObj: any
) {
	initializeDefaults(mapping, dstObj)

	for (const xmlName in mapping) {
		readField(xmlName, mapping[xmlName], srcElem, dstObj)
	}
}

function readField(
	xmlName: string,
	mapping: FieldMapping,
	srcElem: Element,
	dstObj: any
) {
	const { isAttribute, name, targetField } = resolveField(xmlName, mapping)

	switch (mapping.kind) {
		case 'scalar': {
			const raw = isAttribute
				? srcElem.getAttribute(name)
				: getElementValue(srcElem, name)
			dstObj[targetField] = coerceValue(raw, mapping.type)
			return
		}
		case 'object': {
			const childElem = directChildElements(srcElem, name)[0]
			if (childElem === undefined) return

			const target = mapping.self ? dstObj : {}
			readObject(mapping.fields, childElem, target)
			if (!mapping.self) dstObj[targetField] = target
			return
		}
		case 'array': {
			for (const childElem of directChildElements(srcElem, name)) {
				const item = {}
				readObject(mapping.items, childElem, item)
				;(dstObj[targetField] as any[]).push(item)
			}
			return
		}
		case 'custom': {
			const childElem = directChildElements(srcElem, name)[0]
			if (childElem === undefined) return
			dstObj[targetField] = mapping.read(childElem)
			return
		}
		/* v8 ignore next 2 */
		default:
			assertUnreachable(mapping)
	}
}

/**
 * Sets the default value ([] for arrays, null for nested objects/custom
 * fields) of every field in `mapping` that isn't already present on
 * `dstObj`. Descends into `unwrap()`-ed fields, since those apply to the
 * same object, but not into ordinary nested objects/arrays, since those get
 * their own defaults lazily, only if their element actually turns up.
 */
function initializeDefaults(mapping: ObjectMapping, dstObj: any) {
	for (const xmlName in mapping) {
		const fieldMapping = mapping[xmlName]
		const { targetField } = resolveField(xmlName, fieldMapping)

		switch (fieldMapping.kind) {
			case 'scalar':
				// Always (re)assigned when read; no default needed.
				break
			case 'array':
				if (dstObj[targetField] === undefined) dstObj[targetField] = []
				break
			case 'object':
				if (fieldMapping.self) {
					initializeDefaults(fieldMapping.fields, dstObj)
				} else if (dstObj[targetField] === undefined) {
					dstObj[targetField] = null
				}
				break
			case 'custom':
				if (dstObj[targetField] === undefined)
					dstObj[targetField] = null
				break
			/* v8 ignore next 2 */
			default:
				assertUnreachable(fieldMapping)
		}
	}
}

/****
 * Shared helpers
 ****/

/** Resolves the attribute/element name and destination field name shared by both directions. */
function resolveField(xmlName: string, mapping: FieldMapping) {
	const isAttribute = xmlName.startsWith('@')
	const name = isAttribute ? xmlName.substring(1) : xmlName
	const targetField = mapping.expr ?? name
	return { isAttribute, name, targetField }
}

/**
 * Coerces a raw attribute/element string value into the type described by
 * `type`. See `FieldType` for what each option means.
 */
function coerceValue(raw: string | null, type?: FieldType) {
	switch (type) {
		case 'attrString':
			return raw ?? ''
		case 'float':
			return parseFloat(raw ?? '')
		case 'floatOrNull': {
			const value = parseFloat(raw ?? '')
			return Number.isNaN(value) ? null : value
		}
		case 'intOrNull': {
			const value = parseInt(raw ?? '', 10)
			return Number.isNaN(value) ? null : value
		}
		case 'date':
			return raw == null ? null : new Date(raw)
		default:
			return raw
	}
}

/**
 * Extracts a value from a direct child of the given element, by tag name.
 *
 * @param parent An element to extract a value from
 * @param tag The tag of the child element that contains the desired data (e.g. "time" or "name")
 * @returns A string containing the desired value
 */
function getElementValue(parent: Element, tag: string): string | null {
	const element = directChildElements(parent, tag)[0]

	if (element !== undefined) {
		return element.firstChild?.textContent ?? element.innerHTML ?? null
	}
	return null
}

/**
 * Finds the direct children of the given element that match the given tag
 * name. Restricting the search to direct children (rather than any
 * descendant) avoids accidentally matching a same-named tag nested further
 * down, e.g. a track's own `<type>` versus its `<link><type>`.
 *
 * @param parent A parent element to search within
 * @param tag The tag of the child elements to search for
 * @returns The matching direct child elements, in document order
 */
function directChildElements(parent: Element, tag: string): Element[] {
	try {
		// Find all matching direct descendants
		return Array.from(parent.querySelectorAll(`:scope > ${tag}`))
	} catch (_e) {
		// Handle non-browser or older environments that don't support :scope
		return (Array.from(parent.childNodes) as unknown as Element[]).filter(
			(element) => element && element.tagName === tag
		)
	}
}

/* v8 ignore start -- only reachable if a new FieldMapping kind is added
   without updating every switch above; the exhaustiveness check on `never`
   is what actually catches that case, at compile time. */
function assertUnreachable(value: never): never {
	throw new Error(`Unsupported field mapping: ${JSON.stringify(value)}`)
}
/* v8 ignore stop */
