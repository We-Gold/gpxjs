import { expect, test, assertType, describe } from "vitest"

import { parseGPX } from "../lib/index";
import { stringifyGPX } from "../lib/stringify";

import { testGPXFile } from "./test-gpx-file"

describe("stringfy", () => {
  test("converts ParsedGPX to string", () => {
    const [gpx, error] = parseGPX(testGPXFile);
    const xml = stringifyGPX(gpx);
    expect(prettyPrintXml(xml)).toEqual(prettyPrintXml(EXPECTED_XML));
  })
});

const EXPECTED_XML =
`<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="gpxjs">
  <metadata>
    <name>GPX Test</name>
    <desc>Test Description</desc>
    <author>
      <name>Test Author</name>
      <email id="test" domain="test.com"/>
      <link href="https://test.com">
        <text>Author Website</text>
        <type>Web</type>
      </link>
    </author>
    <link href="https://test2.com">
      <text>General Website</text>
      <type>Web</type>
    </link>
    <time>2020-01-12T21:32:52</time>
  </metadata>
  <wpt lat="47.253146555709" lon="-1.5153741828293">
    <name>Porte de Carquefou</name>
    <desc>Route</desc>
    <ele>35</ele>
    <time>2020-02-02T07:54:30.000Z</time>
    <cmt>Warning</cmt>
  </wpt>
  <wpt lat="47.235331031612" lon="-1.5482325613225">
    <name>Pont de la Tortière</name>
    <desc>Route</desc>
    <ele>20</ele>
    <time>2020-02-02T07:54:30.000Z</time>
    <cmt>Bridge</cmt>
  </wpt>
  <trk>
    <name>Track</name>
    <cmt>Bridge</cmt>
    <desc>Test track</desc>
    <src>GPX Test Device</src>
    <number>1</number>
    <link href="https://test.com">
      <text>Track Website</text>
      <type>Web</type>
    </link>
    <type>MTB</type>
    <trkseg>
      <trkpt lat="47.2278526991611" lon="-1.5521714646550901">
        <ele>12.36</ele>
        <time>2020-02-02T07:54:30.000Z</time>
        <extensions>
          <strext>testString</strext>
          <intext>3</intext>
          <floatext>1.75</floatext>
          <subext>
            <subval>33</subval>
          </subext>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
  <rte>
    <name>Track</name>
    <cmt>Bridge</cmt>
    <desc>Test route</desc>
    <src>GPX Test Device</src>
    <number>1</number>
    <link href="https://test.com">
      <text>Route Website</text>
      <type>Web</type>
    </link>
    <type>MTB</type>
    <rtept lat="47.2278526991611" lon="-1.5521714646550901">
      <ele>12.36</ele>
      <time>2020-02-02T07:54:30.000Z</time>
    </rtept>
  </rte>
</gpx>`

/****
 * Test Support Methods
 ****/

const XSLT_PRETTY_PRINT = [
  '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
  '  <xsl:template match="node()|@*">',
  '    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
  '  </xsl:template>',
  '  <xsl:output indent="yes"/>',
  '</xsl:stylesheet>',
].join('\n');

function prettyPrintXml(xml) {
  const parser = new DOMParser();

  const xsltDoc = parser.parseFromString(XSLT_PRETTY_PRINT, 'text/xml');
  const xsltProcessor = new XSLTProcessor();
  xsltProcessor.importStylesheet(xsltDoc);

  const doc = parser.parseFromString(xml, 'text/xml');
  const prettyDoc = xsltProcessor.transformToDocument(doc);
  return new XMLSerializer().serializeToString(prettyDoc);
}
