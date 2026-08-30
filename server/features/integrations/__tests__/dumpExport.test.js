import { describe, expect, it, vi } from 'vitest'
import { runDumpExport } from '../dumpExport.js'

function dependencies(result = { content: { songs: [{ id: 1 }] } }) {
  return {
    fetchExport: vi.fn().mockResolvedValue(result),
    writeFile: vi.fn(),
    log: vi.fn(),
    error: vi.fn(),
  }
}

describe('export dump command', () => {
  it('prints usage and returns a failure status without a slug', async () => {
    const deps = dependencies()
    await expect(runDumpExport([], deps)).resolves.toBe(1)
    expect(deps.error).toHaveBeenCalledWith('usage: npm run export:dump -- <band-slug> [outfile.json]')
    expect(deps.fetchExport).not.toHaveBeenCalled()
  })

  it('uses the main slug and reports a missing export distinctly', async () => {
    const deps = dependencies({ notFound: true })
    await expect(runDumpExport(['band/release'], deps)).resolves.toBe(2)
    expect(deps.fetchExport).toHaveBeenCalledWith('band')
    expect(deps.error).toHaveBeenCalledWith('GigBuddy has no export for "band" (404)')
  })

  it('prints formatted JSON when no output file is requested', async () => {
    const deps = dependencies({ content: { band: { name: 'The Testers' } } })
    await expect(runDumpExport(['band'], deps)).resolves.toBe(0)
    expect(deps.log).toHaveBeenCalledWith(JSON.stringify({ band: { name: 'The Testers' } }, null, 2))
    expect(deps.writeFile).not.toHaveBeenCalled()
  })

  it('writes formatted JSON with a trailing newline when requested', async () => {
    const deps = dependencies({ content: { songs: [] } })
    const json = JSON.stringify({ songs: [] }, null, 2)
    await expect(runDumpExport(['band', 'export.json'], deps)).resolves.toBe(0)
    expect(deps.writeFile).toHaveBeenCalledWith('export.json', `${json}\n`)
    expect(deps.error).toHaveBeenCalledWith(`wrote ${json.length} bytes to export.json`)
  })

  it('reports upstream and filesystem failures', async () => {
    const deps = dependencies()
    deps.fetchExport.mockRejectedValue(new Error('upstream unavailable'))
    await expect(runDumpExport(['band'], deps)).resolves.toBe(1)
    expect(deps.error).toHaveBeenCalledWith('upstream unavailable')
  })
})
