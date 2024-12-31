import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
    esbuild: {
        keepNames: true,
        minifyIdentifiers: false,
    },
    build: {
        minify: 'esbuild',
        lib: {
            entry: resolve(__dirname, 'lib/index.ts'),
            name: 'gpxjs',
            fileName: 'gpxjs',
        }
    },
    test: {
        browser: {
          enabled: true,
          name: 'chrome',
          headless: true,
        },
    },
    plugins: [dts()],
    define: {
        // Shim required for using the custom parser
        global: {},
    },
})