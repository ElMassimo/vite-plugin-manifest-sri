import { createHash } from 'crypto'
import { resolve } from 'path'
import { promises as fs } from 'fs'
import type { Plugin, Manifest, ManifestChunk } from 'vite'

export type Algorithm = 'sha256' | 'sha384' | 'sha512'

export type Transformer<T> = (manifest: Manifest) => T

export interface Options<T> {
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
  * Transforms or formats the final manifest before it is written.
  */
  transformer?: Transformer<T>
}

declare module 'vite' {
  interface ManifestChunk {
    integrity: string
  }
}

export default function manifestSRI<T = Manifest>(options: Options<T> = {}): Plugin {
  const {
    algorithms = ['sha384'],
    manifestPaths = ['manifest.json', 'manifest-assets.json'],
    transformer = undefined,
  } = options

  return {
    name: 'vite-plugin-manifest-sri',
    apply: 'build',
    enforce: 'post',
    async writeBundle({ dir }) {
      await Promise.all(manifestPaths.map(path => augmentManifest(path, algorithms, dir!, transformer)))
    },
  }
}

async function augmentManifest<T>(manifestPath: string, algorithms: string[], outDir: string, transformer?: Transformer<T>) {
  const resolveInOutDir = (path: string) => resolve(outDir, path)
  manifestPath = resolveInOutDir(manifestPath)

  const manifest: Manifest | undefined
    = await fs.readFile(manifestPath, 'utf-8').then(JSON.parse, () => undefined)

  if (manifest) {
    await Promise.all(Object.values(manifest).map(async (chunk) => {
      chunk.integrity = integrityForAsset(await fs.readFile(resolveInOutDir(chunk.file)), algorithms)
    }))
    const dataToWrite = JSON.stringify(transformer === undefined ? manifest : transformer(manifest), null, 2)
    await fs.writeFile(manifestPath, dataToWrite)
  }
}

function integrityForAsset(source: Buffer, algorithms: string[]) {
  return algorithms.map(algorithm => calculateIntegrityHash(source, algorithm)).join(' ')
}

export function calculateIntegrityHash(source: Buffer, algorithm: string) {
  const hash = createHash(algorithm).update(source).digest().toString('base64')
  return `${algorithm.toLowerCase()}-${hash}`
}
