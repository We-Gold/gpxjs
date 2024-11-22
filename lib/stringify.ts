import { ParsedGPX } from "./parsed_gpx";
import { Extensions, XMLSerializationStrategy } from "./types";


/**
 * Converts a ParsedGPX object back into a GPX XML string.
 * @param gpx the parsed GPX object to serialize
 * @param customXmlSerializer an optional custom XMLSerializer implementation.
 *   If not specified, a default XMLSerializer instance will be created.
 * @returns a serialized XML string in the GPX format
 */
export function stringifyGPX(gpx: ParsedGPX, customXmlSerializer?: XMLSerializationStrategy): string {
    const doc = gpx.xml.implementation.createDocument(GPX_NS, "gpx");
    doc.documentElement.setAttribute('version', '1.1');
    doc.documentElement.setAttribute('creator', 'gpxjs');
    const mapper = new XmlMapper(doc);
    mapper.mapObject(GPX_MAPPING, gpx, doc.documentElement);
    const serializer = customXmlSerializer ?? new XMLSerializer();
    return serializer.serializeToString(doc);
}

/****
 * Implementation Details
 * 
 * We provide a system for specifying the mapping from a ParsedGPX data
 * structure to a corresponding XML structure, without having to write code for
 * each field.
 ****/

// GPX XML Namespace
const GPX_NS = 'http://www.topografix.com/GPX/1/1';

// Special properties used in field mapping.  See documentation in FieldMapping.
const EXPR_PROPERTY = '$expr';
const FOR_PROPERTY = '$for';
const FUNC_PROPERTY = '$func';

/**
 * Specifies the XML mapping for an object.
 */
type ObjectMapping = {
    /**
     * Each key represents an XML element or attribute in the output value,
     * while the associated value specifies how that content of the element is
     * produced from the source data.
     * 
     * To specify an attribute, use a key like '@attribute_name'.  Otherwise,
     * the key specifies an element name.
     * 
     * If the key-value is a string, it specifies the corresponding field in
     * the source object that will be read to fill the element value.  If the
     * key-value is '=', then the element name will be used as the field name.
     * 
     * If the key-value specifies a nested ObjectMapping, then that mapping will
     * be used to recursively generate additional sub-elements in the mapping.
     * That mapping can be tweaked with a few specific fields.  See FieldMapping
     * for more details.
     */
    [key: string]: string | ObjectMapping | FieldMapping
}

/**
 * Specifies special behavior when mapping a sub-object.
 */
type FieldMapping = {
    /**
     * Normally, the element name is used to determine the corresponding object
     * field name to use when looking up the object value used in a mapping.
     * The $expr property can be used to specify a different field name to use.
     */
    $expr?: string
    /**
     * For repeated elements generated from an array, specify this field with
     * the corresponding 
     */
    $for?: ObjectMapping
    /**
     * For complex mappings, specify a function with the following signature:
     *   (doc: Document, srcObj: any, dstElem: Element)
     * This function will be called, allowing one to specify arbitrary mapping
     * behavior.
     */
    $func?: Function
}

/****
 * GPX Schema Mapping
 ****/

const LINK_MAPPING: ObjectMapping = {
    "@href": '=',
    text: '=',
    type: '='
}

// We need a special mapping function to handle the arbitrary data in an
// Extensions object.
function ExtensionsMapping(doc: Document, srcObj: Extensions, dstElem: Element) {
    for (const key in srcObj) {
        const elem = doc.createElementNS(GPX_NS, key);
        dstElem.append(elem);
        const value = srcObj[key];
        if (typeof value === 'object') {
            ExtensionsMapping(doc, value, elem);
        } else {
            const node = doc.createTextNode(value.toString());
            elem.append(node);
        }
    }
}

const POINT_MAPPING: ObjectMapping = {
    '@lat': 'latitude',
    '@lon': 'longitude',
    ele: 'elevation',
    time: '=',
    extensions: {
        $func: ExtensionsMapping
    }
}

const GPX_MAPPING: ObjectMapping = {
    metadata: {
        name: '=',
        desc: 'description',
        author: {
            name: '=',
            email: {
                '@id': '=',
                '@domain': '='
            },
            link: LINK_MAPPING
        },
        link: LINK_MAPPING,
        time: '='
    },
    wpt: {
        $expr: 'waypoints',
        $for: {
            '@lat': 'latitude',
            '@lon': 'longitude',
            name: '=',
            desc: 'description',
            ele: 'elevation',
            time: '=',
            cmt: 'comment'
        }
    },
    trk: {
        $expr: 'tracks',
        $for: {
            name: '=',
            cmt: 'comment',
            desc: 'description',
            src: '=',
            number: '=',
            link: LINK_MAPPING,
            type: '=',
            trkseg: {
                $expr: '.',
                trkpt: {
                    $expr: 'points',
                    $for: POINT_MAPPING
                },
            },
        },
    },
    rte: {
        $expr: 'routes',
        $for: {
            name: '=',
            cmt: 'comment',
            desc: 'description',
            src: '=',
            number: '=',
            link: LINK_MAPPING,
            type: '=',
            rtept: {
                $expr: 'points',
                $for: POINT_MAPPING
            }
        }
    }
};

class XmlMapper {
    private doc: Document;
    constructor(doc: Document) {
        this.doc = doc;
    }

    /**
     * Generate XML attributes and elements using the given mapping.
     */
    mapObject(objectMapping: ObjectMapping, srcObj: any, dstElem: Element) {
        for (const field in objectMapping) {
            if (field === EXPR_PROPERTY) {
                continue;
            }
            this.mapField(field, objectMapping[field], srcObj, dstElem);
        }
    }

    /**
     * Generate XML elements and attributes for the specified field.
     */
    mapField(
        fieldExpr: string,
        mapping: string | ObjectMapping | FieldMapping,
        srcObj: any,
        dstElem: Element
    ) {
        const isAttribute = fieldExpr.startsWith('@');
        const fieldName = isAttribute ? fieldExpr.substring(1) : fieldExpr;

        if (typeof mapping === "object") {
            const fieldMapping = mapping as FieldMapping;
            const fieldValue = this.evalExpr(srcObj, fieldMapping[EXPR_PROPERTY] ?? '=', fieldName);
            if (fieldValue == null) {
                return;
            }
            const forMapping = fieldMapping[FOR_PROPERTY];
            if (forMapping) {
                for (const value of fieldValue) {
                    const elem = this.doc.createElementNS(GPX_NS, fieldName);
                    dstElem.append(elem);
                    this.mapObject(forMapping, value, elem);
                }
            } else {
                const elem = this.doc.createElementNS(GPX_NS, fieldName);
                dstElem.append(elem);

                const funcMapping = fieldMapping[FUNC_PROPERTY];
                if (funcMapping) {
                    funcMapping(this.doc, fieldValue, elem);
                } else {
                    this.mapObject(mapping as ObjectMapping, fieldValue, elem);
                }
            }
        } else if (typeof mapping === "string") {
            const value = this.evalExpr(srcObj, mapping, fieldName);
            if (value == null) {
                return;
            }

            if (isAttribute) {
                dstElem.setAttribute(fieldName, value);
            } else {
                const valueElem = this.doc.createElementNS(GPX_NS, fieldName);
                dstElem.append(valueElem);
                const node = this.doc.createTextNode(value);
                valueElem.append(node);
            }
        } else {
            throw new Error(`Unsupported field mapping: ${mapping}`)
        }
    }

    /**
     * Evalutes a field expression for the specified object.  If the expression
     * equals `=`, then the specified `fieldName` will be used.
     */
    evalExpr(srcObj: any, expr: string, fieldName: string) {
        let property = expr;
        if (expr === '.') {
            return srcObj;
        } else if (expr === '=') {
            property = fieldName;
        }
        const value = srcObj[property];

        // Special handling for Date objects.
        if (value != null && typeof value === 'object' && fieldName === 'time') {
            return value.toISOString();
        }

        return value;
    }
}
