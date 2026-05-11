import { describe, expect, it } from 'vitest'
import { createDslCompleter, createFnOnlyCompleter } from './dsl-completer.ts'
import { FUNCTION_CATALOG } from './function-catalog.ts'

// ── Helpers ────────────────────────────────────────────────────────────────────

type AceCompletion = { caption: string; snippet: string; meta: string; score?: number }

function complete(
  completer: ReturnType<typeof createDslCompleter>,
  line: string,
  column?: number,
): AceCompletion[] {
  const col = column ?? line.length
  const session = { getLine: () => line }
  let result: AceCompletion[] = []
  completer.getCompletions(null, session, { row: 0, column: col }, '', (_err: unknown, items: AceCompletion[]) => {
    result = items
  })
  return result
}

// ── createFnOnlyCompleter ──────────────────────────────────────────────────────

describe('createFnOnlyCompleter', () => {
  const completer = createFnOnlyCompleter('en')

  it('returns all function catalog entries', () => {
    const items = complete(completer, '')
    expect(items).toHaveLength(FUNCTION_CATALOG.length)
  })

  it('every completion has meta "fn"', () => {
    const items = complete(completer, '')
    for (const item of items) {
      expect(item.meta).toBe('fn')
    }
  })

  it('completions are sorted by descending score', () => {
    const items = complete(completer, '')
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].score).toBeGreaterThanOrEqual(items[i].score ?? 0)
    }
  })

  it('includes known function names', () => {
    const items = complete(completer, '')
    const captions = items.map((c) => c.caption)
    expect(captions).toContain('uuid')
    expect(captions).toContain('int')
    expect(captions).toContain('choice')
  })

  it('returns the same completions regardless of line context', () => {
    const a = complete(completer, '')
    const b = complete(completer, '"$fn": "')
    const c = complete(completer, '{ ')
    expect(a).toEqual(b)
    expect(a).toEqual(c)
  })

  it('has identifierRegexps that match bare words', () => {
    expect(completer.identifierRegexps).toHaveLength(1)
    expect(completer.identifierRegexps[0].test('uuid')).toBe(true)
    expect(completer.identifierRegexps[0].test('.value')).toBe(true)
  })
})

// ── createDslCompleter ─────────────────────────────────────────────────────────

describe('createDslCompleter', () => {
  const completer = createDslCompleter('en')

  it('returns fn completions + .field inside "$fn": "..."', () => {
    const items = complete(completer, '"$fn": "')
    const fnItems = items.filter((c) => c.meta === 'fn')
    expect(fnItems.length).toBe(FUNCTION_CATALOG.length)
    expect(items.some((c) => c.caption === '.field')).toBe(true)
  })

  it('returns dsl + wrapped fn after {', () => {
    const items = complete(completer, '{ ')
    const metas = new Set(items.map((c) => c.meta))
    expect(metas).toContain('dsl')
    expect(metas).toContain('$fn')
  })

  it('returns dsl + wrapped fn after comma', () => {
    const items = complete(completer, '"value": 1, ')
    const metas = new Set(items.map((c) => c.meta))
    expect(metas).toContain('dsl')
    expect(metas).toContain('$fn')
  })

  it('returns empty array for unrecognized context', () => {
    const items = complete(completer, '   123 ')
    expect(items).toEqual([])
  })

  it('dsl completions include known constructs', () => {
    const items = complete(completer, '{ ')
    const captions = items.map((c) => c.caption)
    expect(captions).toContain('when')
    expect(captions).toContain('$fn')
    expect(captions).toContain('$ref')
    expect(captions).toContain('$path')
  })

  it('dsl completions have higher score than wrapped fn', () => {
    const items = complete(completer, '{ ')
    const dslScores = items.filter((c) => c.meta === 'dsl').map((c) => c.score!)
    const fnScores = items.filter((c) => c.meta === '$fn').map((c) => c.score!)
    const minDsl = Math.min(...dslScores)
    const maxFn = Math.max(...fnScores)
    expect(minDsl).toBeGreaterThan(maxFn)
  })

  it('works with both locales', () => {
    const plCompleter = createDslCompleter('pl')
    const plItems = complete(plCompleter, '"$fn": "')
    expect(plItems.length).toBeGreaterThanOrEqual(FUNCTION_CATALOG.length)
  })
})
