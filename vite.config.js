import { resolve } from 'path'
import { defineConfig } from 'vite'

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
})