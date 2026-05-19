import { describe, expect, it } from 'vitest'
import { resolveCollectionContext } from './dispatchExecution.utils'
import type { CollectionSummary } from '../../../../services/message-dispatch.service'

const collection = (
  collectionName: string,
  collectionContext: Record<string, unknown> = {},
): CollectionSummary => ({ collectionName, collectionContext })

describe('resolveCollectionContext', () => {
  it('returns empty context and not-missing when activeCollectionName is empty', () => {
    const result = resolveCollectionContext([collection('a', { foo: 1 })], '')
    expect(result).toEqual({ context: {}, missing: false })
  })

  it('returns empty context and not-missing when activeCollectionName is null', () => {
    const result = resolveCollectionContext([collection('a', { foo: 1 })], null)
    expect(result).toEqual({ context: {}, missing: false })
  })

  it('returns matching collectionContext when active collection is found', () => {
    const result = resolveCollectionContext(
      [collection('a', { foo: 1 }), collection('b', { bar: 2 })],
      'b',
    )
    expect(result).toEqual({ context: { bar: 2 }, missing: false })
  })

  it('returns empty context and not-missing when found collection has empty context', () => {
    const result = resolveCollectionContext([collection('a', {})], 'a')
    expect(result).toEqual({ context: {}, missing: false })
  })

  it('flags missing=true when activeCollectionName has no match', () => {
    const result = resolveCollectionContext([collection('a')], 'gone')
    expect(result).toEqual({ context: {}, missing: true })
  })

  it('flags missing=true when collections list is empty', () => {
    const result = resolveCollectionContext([], 'gone')
    expect(result).toEqual({ context: {}, missing: true })
  })
})
