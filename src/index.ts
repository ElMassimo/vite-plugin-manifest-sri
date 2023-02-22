import { createHash } from 'crypto'
import { resolve } from 'path'
import { promises as fs } from 'fs'
import type { Plugin, Manifest, ManifestChunk } from 'vite'

export type Algorithm = 'sha256' | 'sha384' | 'sha512'

export type ChunkFinder = (manifest: Manifest) => ManifestChunk[]

export interface Options {
  /**
   * Which hashing algorithms to use when calculate the integrity hash for each
   * asset in the manifest.
   *
   * @default ['sha384']
   */
  algorithms?: Algorithm[]

  /**
   * Path of the manifest files that should be read and augmented with the
   * integrity hash, relative to `outDir`.
   *
   * @default ['manifest.json', 'manifest-assets.json']
   */
  manifestPaths?: string[]

  /**
   * A function that returns the chunks that should be augmented with the integrity hash.
   * This can be useful if your manifest has already been transformed to a custom output format.
   *
   * @default (manifest) => Object.values(manifest)
   */
  chunkFinder?: ChunkFinder
}

declare module 'vite' {
  interface ManifestChunk {
    integrity: string
  }
}

export default function manifestSRI(options: Options = {}): Plugin {
  const {
    algorithms = ['sha384'],
    manifestPaths = ['manifest.json', 'manifest-assets.json'],
    chunkFinder = Object.values,
  } = options

  return {
    name: 'vite-plugin-manifest-sri',
    apply: 'build',
    enforce: 'post',
    async writeBundle({ dir }) {
      await Promise.all(manifestPaths.map(path => augmentManifest(path, algorithms, dir!, chunkFinder)))
    },
  }
}

async function augmentManifest(manifestPath: string, algorithms: string[], outDir: string, chunkFinder: ChunkFinder) {
  const resolveInOutDir = (path: string) => resolve(outDir, path)
  manifestPath = resolveInOutDir(manifestPath)

  const manifest: Manifest | undefined
    = await fs.readFile(manifestPath, 'utf-8').then(JSON.parse, () => undefined)

  if (manifest) {
    await Promise.all(chunkFinder(manifest).map(async (chunk) => {
      chunk.integrity = integrityForAsset(await fs.readFile(resolveInOutDir(chunk.file)), algorithms)
    }))
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
  }
}

function integrityForAsset(source: Buffer, algorithms: string[]) {
  return algorithms.map(algorithm => calculateIntegrityHash(source, algorithm)).join(' ')
}

export function calculateIntegrityHash(source: Buffer, algorithm: string) {
  const hash = createHash(algorithm).update(source).digest().toString('base64')
  return `${algorithm.toLowerCase()}-${hash}`
}
