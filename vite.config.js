import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { playwright } from '@vitest/browser-playwright'

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
        }
    },
    test: {
        browser: {
            provider: playwright(),
            enabled: true,
            headless: true,
            instances: [{ browser: 'chromium' }],
        },
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
