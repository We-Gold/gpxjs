import { resolve } from 'node:path'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
	build: {
		// Intentional: keep function/class names intact (e.g. `ParsedGPX`)
		// instead of letting them get mangled to single letters. This has
		// been the behavior since the library's first commit, so we're
		// preserving it deliberately rather than dropping it on a bundler
		// upgrade. It keeps stack traces and any `.name`/`.constructor.name`
		// usage (ours or a consumer's) readable, at the cost of a few extra
		// bytes. Whitespace and dead code are still stripped normally.
		minify: { mangle: false },
		lib: {
			entry: resolve(__dirname, 'lib/index.ts'),
			name: 'gpxjs',
			fileName: 'gpxjs',
		},
	},
	test: {
		coverage: {
			provider: 'v8',
			include: ['lib/**'],
			reporter: ['text', 'json-summary', 'html'],
		},
		// Split into two projects because the library targets two different
		// runtimes: `parseGPX` relies on the browser's DOMParser, while
		// `parseGPXWithCustomParser` (used with xmldom-qsa) is meant for
		// Node.js and other non-browser environments like React Native. The
		// "node" project runs in a real Node environment with no `window` or
		// `document` globals, so it can actually exercise the non-browser
		// code paths instead of just simulating them inside a browser.
		projects: [
			{
				extends: true,
				test: {
					name: 'browser',
					include: ['test/**/*.spec.ts'],
					exclude: ['test/node/**'],
					browser: {
						provider: playwright(),
						enabled: true,
						headless: true,
						instances: [{ browser: 'chromium' }],
					},
					// Only the browser-DOMParser benchmark runs here; the
					// xmldom-qsa one below needs the "node" project instead.
					benchmark: {
						include: ['bench/parse-browser.bench.ts'],
					},
				},
			},
			{
				extends: true,
				test: {
					name: 'node',
					environment: 'node',
					include: ['test/node/**/*.spec.ts'],
					benchmark: {
						include: ['bench/parse-node.bench.ts'],
					},
				},
			},
		],
	},
	plugins: [
		dts({
			entryRoot: 'lib',
			include: ['lib'],
		}),
	],
	define: {
		// Shim required for using the custom parser
		global: {},
	},
})
