export const testGPXFile = 
`<?xml version="1.0" encoding="UTF-8" ?>
<gpx version="1.1" creator="Test Creator">
    <metadata>
        <name>GPX Test</name>
        <desc>Test Description</desc>
        <author>
            <name>Test Author</name>
            <email id="test" domain="test.com"></email>
            <link href="https://test.com">
                <text>Author Website</text>
                <type>Web</type>
            </link>
        </author>
        <copyright author="Test Copyright Owner">
            <year>2024</year>
            <license>MIT</license>
        </copyright>
        <link href="https://test2.com">
            <text>General Website</text>
            <type>Web</type>
        </link>
        <time>2020-01-12T21:32:52</time>
        <keywords>Test, gpx, file</keywords>
        <bounds minlat="49.12965660728301" minlon="-1.5521714646550901" maxlat="45.85097922514941"
                maxlon="4.336738935765406"></bounds>
    </metadata>
    <wpt lat="47.253146555709" lon="-1.5153741828293">
        <name>Porte de Carquefou</name>
        <desc>Route</desc>
        <ele>35</ele>
        <time>2020-02-02T07:54:30Z</time>
        <cmt>Warning</cmt>
    </wpt>
    <wpt lat="47.235331031612" lon="-1.5482325613225">
        <name>Pont de la Tortière</name>
        <desc>Route</desc>
        <ele>20</ele>
        <time>2020-02-02T07:54:30Z</time>
        <cmt>Bridge</cmt>
    </wpt>
    <trk>
        <name>Track</name>
        <cmt>Bridge</cmt>
        <desc>Test track</desc>
        <src>GPX Test</src>
        <number>1</number>
        <link href="https://test.com">
            <text>Author Website</text>
            <type>Web</type>
        </link>
        <type>MTB</type>
        <trkseg>
            <trkpt lat="47.2278526991611" lon="-1.5521714646550901">
                <ele>12.36</ele>
                <time>2020-02-02T07:54:30Z</time>
                <extensions>
                    <strext>testString</strext>
                    <intext>3</intext>
                    <floatext>1.75</floatext>
                    <subtext>
                        <subval>33.0</subval>
                    </subtext>
                </extensions>
            </trkpt>
            <trkpt lat="47.229236980562256" lon="-1.5504753767742476">
                <ele>7.08</ele>
                <time>2020-02-02T07:54:30Z</time>
                <extensions>
                    <strext>testString</strext>
                    <intext>3</intext>
                    <floatext>1.75</floatext>
                    <subtext>
                        <subval>33.0</subval>
                    </subtext>
                </extensions>
            </trkpt>
            <trkpt lat="47.2301112449252" lon="-1.5493804339650867">
                <ele>7.07</ele>
                <time>2020-02-02T07:54:30Z</time>
                <extensions>
                    <strext>testString</strext>
                    <intext>3</intext>
                    <floatext>1.75</floatext>
                    <subtext>
                        <subval>33.0</subval>
                    </subtext>
                </extensions>
            </trkpt>
        </trkseg>
    </trk>
    <rte>
        <name>Track</name>
        <cmt>Bridge</cmt>
        <desc>Test track</desc>
        <src>GPX Test</src>
        <number>1</number>
        <link href="https://test.com">
            <text>Author Website</text>
            <type>Web</type>
        </link>
        <type>MTB</type>
        <rtept lat="47.2278526991611" lon="-1.5521714646550901">
            <ele>12.36</ele>
            <time>2020-02-02T07:54:30Z</time>
        </rtept>
        <rtept lat="47.229236980562256" lon="-1.5504753767742476">
            <ele>7.08</ele>
            <time>2020-02-02T07:54:30Z</time>
        </rtept>
        <rtept lat="47.2301112449252" lon="-1.5493804339650867">
            <ele>7.07</ele>
            <time>2020-02-02T07:54:30Z</time>
        </rtept>
    </rte>
</gpx>`
