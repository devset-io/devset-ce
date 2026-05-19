/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { describe, expect, it, vi } from 'vitest'
import {
  findDuplicateFields,
  performSaveCollectionContext,
  type SaveCollectionContextDeps,
} from './saveCollectionContext'
import { createInitialState } from '../../state/MessageDispatch.reducer'
import type {
  CollectionContextEntry,
  MessageDispatchAction,
  MessageDispatchState,
} from '../../state/MessageDispatch.types'

// ── findDuplicateFields ─────────────────────────────────────

describe('findDuplicateFields', () => {
  it('returns empty when all fields are unique', () => {
    expect(findDuplicateFields(['a', 'b', 'c'])).toEqual([])
  })

  it('reports each duplicate after its first occurrence', () => {
    expect(findDuplicateFields(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b'])
  })

  it('ignores blank / whitespace-only entries', () => {
    expect(findDuplicateFields(['a', '', '   ', 'a'])).toEqual(['a'])
  })

  it('treats trimmed equality as duplication', () => {
    expect(findDuplicateFields(['foo', '  foo  '])).toEqual(['foo'])
  })
})

// ── performSaveCollectionContext ─────────────────────────────

type Harness = {
  deps: SaveCollectionContextDeps
  dispatched: MessageDispatchAction[]
  patchCalls: Array<{ name: string; ctx: Record<string, unknown> }>
  refreshCalls: Array<boolean | undefined>
  successMessages: string[]
  errorMessages: string[]
}

const entry = (id: string, field: string, value: unknown = ''): CollectionContextEntry => ({
  id,
  field,
  value: { kind: 'literal', value },
})

const stateWith = (overrides: Partial<MessageDispatchState>): MessageDispatchState => ({
  ...createInitialState(),
  ...overrides,
})

function buildHarness(
  state: MessageDispatchState,
  patchImpl: SaveCollectionContextDeps['patchCollectionContextApi'] = vi.fn().mockResolvedValue({}),
): Harness {
  const dispatched: MessageDispatchAction[] = []
  const patchCalls: Array<{ name: string; ctx: Record<string, unknown> }> = []
  const refreshCalls: Array<boolean | undefined> = []
  const successMessages: string[] = []
  const errorMessages: string[] = []

  const deps: SaveCollectionContextDeps = {
    state,
    dispatch: (action) => {
      dispatched.push(action)
    },
    t: (key, params) =>
      params ? `${key}|${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')}` : key,
    patchCollectionContextApi: async (name, ctx) => {
      patchCalls.push({ name, ctx })
      return patchImpl(name, ctx)
    },
    refreshCollections: async (showSpinner) => {
      refreshCalls.push(showSpinner)
    },
    onSuccess: (message) => {
      successMessages.push(message)
    },
    onError: (message) => {
      errorMessages.push(message)
    },
  }

  return { deps, dispatched, patchCalls, refreshCalls, successMessages, errorMessages }
}

describe('performSaveCollectionContext', () => {
  it('is a no-op when the modal has no collection name', async () => {
    const state = stateWith({
      collectionContextModalCollectionName: '   ',
      collectionContextModalEntries: [entry('1', 'userId', 'u-1')],
    })
    const h = buildHarness(state)

    await performSaveCollectionContext(h.deps)

    expect(h.dispatched).toEqual([])
    expect(h.patchCalls).toEqual([])
    expect(h.refreshCalls).toEqual([])
    expect(h.successMessages).toEqual([])
    expect(h.errorMessages).toEqual([])
  })

  describe('happy path', () => {
    it('dispatches saving/closed/saving-completed and calls the api + refresh', async () => {
      const state = stateWith({
        collectionContextModalCollectionName: 'orders',
        collectionContextModalEntries: [
          entry('1', 'userId', 'u-1'),
          entry('2', 'when', 'now'),
        ],
      })
      const patchApi = vi.fn().mockResolvedValue({ collectionName: 'orders' })
      const h = buildHarness(state, patchApi)

      await performSaveCollectionContext(h.deps)

      expect(patchApi).toHaveBeenCalledTimes(1)
      expect(h.patchCalls).toEqual([
        { name: 'orders', ctx: { userId: 'u-1', when: 'now' } },
      ])
      expect(h.refreshCalls).toEqual([false])
      expect(h.successMessages).toEqual([
        'dispatch.collectionContext.saved|collectionName=orders',
      ])
      expect(h.errorMessages).toEqual([])
      expect(h.dispatched.map((a) => a.type)).toEqual([
        'savingCollectionContextStarted',
        'collectionContextModalClosed',
        'savingCollectionContextCompleted',
      ])
    })

    it('encodes path/fn/literal values in the payload', async () => {
      const state = stateWith({
        collectionContextModalCollectionName: 'orders',
        collectionContextModalEntries: [
          { id: '1', field: 'userId', value: { kind: 'path', value: 'session.user' } },
          { id: '2', field: 'when', value: { kind: 'fn', value: 'now()' } },
          { id: '3', field: 'count', value: { kind: 'literal', value: 7 } },
        ],
      })
      const h = buildHarness(state)

      await performSaveCollectionContext(h.deps)

      expect(h.patchCalls[0]?.ctx).toEqual({
        userId: { $ref: 'session.user' },
        when: { $fn: 'now()' },
        count: 7,
      })
    })
  })

  describe('duplicate field validation', () => {
    it('dispatches an error, skips the api call, and does not toggle the saving flag', async () => {
      const state = stateWith({
        collectionContextModalCollectionName: 'orders',
        collectionContextModalEntries: [
          entry('1', 'userId', 'u-1'),
          entry('2', 'userId', 'u-2'),
        ],
      })
      const patchApi = vi.fn().mockResolvedValue({})
      const h = buildHarness(state, patchApi)

      await performSaveCollectionContext(h.deps)

      expect(patchApi).not.toHaveBeenCalled()
      expect(h.refreshCalls).toEqual([])
      expect(h.successMessages).toEqual([])
      expect(h.errorMessages).toEqual([])
      expect(h.dispatched).toEqual([
        {
          type: 'collectionContextModalErrorSet',
          error: 'dispatch.collectionContext.errorDuplicateField|field=userId',
        },
      ])
    })

    it('reports the first duplicate when there are several', async () => {
      const state = stateWith({
        collectionContextModalCollectionName: 'orders',
        collectionContextModalEntries: [
          entry('1', 'a'),
          entry('2', 'b'),
          entry('3', 'a'),
          entry('4', 'b'),
        ],
      })
      const h = buildHarness(state)

      await performSaveCollectionContext(h.deps)

      expect(h.dispatched).toEqual([
        {
          type: 'collectionContextModalErrorSet',
          error: 'dispatch.collectionContext.errorDuplicateField|field=a',
        },
      ])
    })
  })

  describe('api error', () => {
    it('uses the BE error message when present and notifies via onError', async () => {
      const state = stateWith({
        collectionContextModalCollectionName: 'orders',
        collectionContextModalEntries: [entry('1', 'userId', 'u-1')],
      })
      const patchApi = vi.fn().mockRejectedValue(new Error('backend exploded'))
      const h = buildHarness(state, patchApi)

      await performSaveCollectionContext(h.deps)

      expect(h.successMessages).toEqual([])
      expect(h.errorMessages).toEqual(['backend exploded'])
      expect(h.refreshCalls).toEqual([])
      expect(h.dispatched.map((a) => a.type)).toEqual([
        'savingCollectionContextStarted',
        'collectionContextModalErrorSet',
        'savingCollectionContextCompleted',
      ])
      expect(h.dispatched[1]).toEqual({
        type: 'collectionContextModalErrorSet',
        error: 'backend exploded',
      })
    })

    it('falls back to the saveFailed i18n key when the thrown error has no message', async () => {
      const state = stateWith({
        collectionContextModalCollectionName: 'orders',
        collectionContextModalEntries: [entry('1', 'userId', 'u-1')],
      })
      const patchApi = vi.fn().mockRejectedValue(new Error(''))
      const h = buildHarness(state, patchApi)

      await performSaveCollectionContext(h.deps)

      expect(h.errorMessages).toEqual(['dispatch.collectionContext.saveFailed'])
      expect(h.dispatched[1]).toEqual({
        type: 'collectionContextModalErrorSet',
        error: 'dispatch.collectionContext.saveFailed',
      })
    })

    it('still dispatches savingCollectionContextCompleted in the finally branch', async () => {
      const state = stateWith({
        collectionContextModalCollectionName: 'orders',
        collectionContextModalEntries: [entry('1', 'userId', 'u-1')],
      })
      const patchApi = vi.fn().mockRejectedValue(new Error('nope'))
      const h = buildHarness(state, patchApi)

      await performSaveCollectionContext(h.deps)

      expect(h.dispatched.at(-1)).toEqual({ type: 'savingCollectionContextCompleted' })
    })
  })
})
