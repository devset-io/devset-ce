import { describe, expect, it, vi } from 'vitest'
import {
  parseStepState,
  parseStepStateStrict,
  resolveCollectionContext,
  resolveDispatchWireFormat,
} from './dispatchExecution.utils'
import type { CollectionSummary } from '../../../../services/message-dispatch.service'

const t = (key: string) => key

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

describe('parseStepStateStrict', () => {
  it('parses a valid JSON object', () => {
    expect(parseStepStateStrict('{"a":1}')).toEqual({ a: 1 })
  })

  it('throws on invalid JSON instead of returning {}', () => {
    expect(() => parseStepStateStrict('{"a":1},sss')).toThrow()
  })

  it('throws when the payload is not an object', () => {
    expect(() => parseStepStateStrict('[1,2,3]')).toThrow()
    expect(() => parseStepStateStrict('"text"')).toThrow()
    expect(() => parseStepStateStrict('null')).toThrow()
  })
})

describe('parseStepState', () => {
  it('parses a valid non-empty JSON object', () => {
    expect(parseStepState('{"a":1}', t)).toEqual({ a: 1 })
  })

  it('throws for non-object payloads (array, string, null)', () => {
    expect(() => parseStepState('[1,2,3]', t)).toThrow()
    expect(() => parseStepState('"text"', t)).toThrow()
    expect(() => parseStepState('null', t)).toThrow()
  })

  it('throws for an empty object', () => {
    expect(() => parseStepState('{}', t)).toThrow()
  })
})

describe('resolveDispatchWireFormat', () => {
  const onInvalidPrefix = vi.fn()

  it('returns undefined when not in protobuf mode', () => {
    const result = resolveDispatchWireFormat({
      isProtobuf: false,
      wireFormatEnabled: true,
      wireFormatPrefixValue: '10',
      onInvalidPrefix,
      t,
    })
    expect(result).toBeUndefined()
  })

  it('returns undefined when wire format is not enabled', () => {
    const result = resolveDispatchWireFormat({
      isProtobuf: true,
      wireFormatEnabled: false,
      wireFormatPrefixValue: '10',
      onInvalidPrefix,
      t,
    })
    expect(result).toBeUndefined()
  })

  it('builds a binary-prefix wire format for a valid prefix value', () => {
    const result = resolveDispatchWireFormat({
      isProtobuf: true,
      wireFormatEnabled: true,
      wireFormatPrefixValue: '16',
      onInvalidPrefix,
      t,
    })
    expect(result).toEqual({ type: 'binary-prefix', prefix: { size: 2, source: 'messagePrefix', value: 16 } })
  })

  it('reports and throws on an invalid prefix value', () => {
    onInvalidPrefix.mockClear()
    expect(() =>
      resolveDispatchWireFormat({
        isProtobuf: true,
        wireFormatEnabled: true,
        wireFormatPrefixValue: 'not-a-number',
        onInvalidPrefix,
        t,
      }),
    ).toThrow()
    expect(onInvalidPrefix).toHaveBeenCalledTimes(1)
  })
})
