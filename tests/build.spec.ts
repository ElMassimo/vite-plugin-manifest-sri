import { readFileSync } from 'fs'
import { resolve } from 'path'
import spawn from 'cross-spawn'
import { beforeAll, describe, test, expect } from 'vitest'
import { calculateIntegrityHash } from '../src/index'

const exampleRoot = resolve(__dirname, '../example')

describe('build', () => {
  beforeAll(() => buildApp(), 15000)

  test('adds integrity hash', () => {
    const manifest = readManifest('manifest.json')

    for (const [_key, chunk] of Object.entries(manifest)) {
      expect(chunk.integrity).toMatch(/^sha384-[A-Za-z0-9+/]+=*$/)
      const file = readFileSync(`${exampleRoot}/public/vite/${chunk.file}`)
      expect(chunk.integrity).toEqual(calculateIntegrityHash(file, 'sha384'))
    }
  })

  test('manifest snapshot', () => {
    expect(readAsset('manifest.json')).toMatchSnapshot()
    expect(readAsset('manifest-assets.json')).toMatchSnapshot()
  })
})

function readManifest (path: string): Record<string, { file: string; integrity: string }> {
  return JSON.parse(readAsset(path))
}

function readAsset (path: string) {
  return readFileSync(`${exampleRoot}/public/vite/.vite/${path}`, 'utf-8')
}

function buildApp () {
  spawn.sync('npm', ['run', 'build'], { stdio: process.env.DEBUG ? 'inherit' : undefined, cwd: exampleRoot })
}
