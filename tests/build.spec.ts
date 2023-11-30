import { readFileSync } from 'fs'
import { resolve } from 'path'
import spawn from 'cross-spawn'
import { beforeAll, describe, test, expect } from 'vitest'

const exampleRoot = resolve(__dirname, '../example')

describe('build', () => {
  beforeAll(() => buildApp(), 5000)

  test('adds integrity hash', () => {
    const manifest = readManifest('manifest.json')
    expect(manifest['entrypoints/main.ts'].integrity)
      .toEqual('sha384-vJj4PmZ9vllU99cNXZ5ozrfo6a0h/wUVLWsVtmbltVr32o549nSSXYMj8ZzenCLt')

    expect(manifest['dynamic.ts'].integrity)
      .toEqual('sha384-KorBstcdnwE8bqEM96n5weR+Q9mNUAR0Hr7tewyfRadn5v1IY58p2bfjmnkxTotE')

    expect(manifest['entrypoints/styles.css'].integrity)
      .toEqual('sha384-HmlJ0WJXVNLaqWQYVRhZgsW1JBN4XBjm3j+j38nagNFimvBxi8nZ1FUysAc9JJvL')

    expect(manifest['entrypoints/main.ts'].cssIntegrity[0])
      .toEqual('sha384-bqzLq+mQSriGZYcwm8aYVPI+TilL6LHvyx/zGwJ8t3r08UKKjeIkeleDKAYTZT1J')
  })

  test('manifest snapshot', () => {
    expect(readAsset('manifest.json')).toMatchSnapshot()
    expect(readAsset('manifest-assets.json')).toMatchSnapshot()
  })
})

function readManifest (path: string) {
  return JSON.parse(readAsset(path))
}

function readAsset (path: string) {
  return readFileSync(`${exampleRoot}/public/vite/.vite/${path}`, 'utf-8')
}

function buildApp () {
  spawn.sync('npm', ['run', 'build'], { stdio: process.env.DEBUG ? 'inherit' : undefined, cwd: exampleRoot })
}
