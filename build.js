#!/usr/bin/env node
import * as esbuild from 'esbuild'
import { readFileSync, existsSync } from 'node:fs'
import bookmarkletPlugin from 'esbuild-plugin-bookmarklet'

const isPrivate = process.argv.includes('--private')
const entry = isPrivate ? 'index.private.js' : 'index.js'
const outfile = isPrivate ? 'dist/pagedump.bookmarklet.private.js' : 'dist/pagedump.bookmarklet.js'

await esbuild.build({
    bundle: true,
    entryPoints: [entry],
    format: 'iife',
    minify: true,
    mangleProps: /^_/,
    legalComments: 'none',
    outfile,
    plugins: [bookmarkletPlugin],
    sourcemap: false,
    target: ['chrome90', 'firefox88', 'safari14', 'edge90'],
    write: false,
})

const out = readFileSync(outfile, 'utf8')
const bytes = Buffer.byteLength(out, 'utf8')

// Optional canary file (one needle per line) provided out-of-tree.
// Used only for the public build; absent in clones that don't need it.
if (!isPrivate && existsSync('.canary-private')) {
    const needles = readFileSync('.canary-private', 'utf8').split('\n').map((s) => s.trim()).filter(Boolean)
    if (needles.some((n) => out.includes(n))) {
        console.error('Build verification failed.')
        process.exit(1)
    }
}

console.log((isPrivate ? 'private' : 'public') + ' bundle: ' + outfile + ' (' + bytes + ' bytes)')
