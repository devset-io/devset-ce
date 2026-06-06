/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { describe, expect, it } from 'vitest'
import { reducer } from './FunctionStudio.reducer'
import type { FunctionStudioState } from './FunctionStudio.types'
import type { FieldOverridePayload } from '../../flow-builder/types'
import { resetStateTaskForm } from '../utils/function-studio-draft'

// ── Helpers ──

// Mirrors useFunctionStudioDrawerState.createInitialState, kept here so the
// tests don't pull in the hook just to construct a clean state baseline.
const makeState = (overrides: Partial<FunctionStudioState> = {}): FunctionStudioState => ({
  scopePath: '',
  activeTaskTab: 'function',
  editorMode: 'function-studio',
  showDiscardConfirm: false,
  isSavingDraft: false,
  pendingOps: [],
  draftSelectedEvent: 'fn-event',
  draftSource: 'none',
  stateTaskForm: resetStateTaskForm(),
  wireFormatEnabled: false,
  wireFormatPrefixSource: 'messagePrefix',
  wireFormatPrefixValue: '',
  wireFormatPrefixValueError: null,
  dslRawHasParseError: false,
  ...overrides,
})

const literalPayload: FieldOverridePayload = {
  mode: 'literal',
  literalKind: 'string',
  value: 'hello',
}

// ── dslRawChanged ──

describe('dslRawChanged', () => {
  it('appends a dsl-raw op when none is queued', () => {
    const next = reducer(makeState(), {
      type: 'dslRawChanged',
      setRaw: '{"a":1}',
      stateRaw: '{}',
    })
    expect(next.pendingOps).toEqual([{ type: 'dsl-raw', setRaw: '{"a":1}', stateRaw: '{}' }])
  })

  it('upserts — a second dispatch replaces the prior op without duplicating', () => {
    const after1 = reducer(makeState(), {
      type: 'dslRawChanged',
      setRaw: '{"a":1}',
      stateRaw: '{}',
    })
    const after2 = reducer(after1, {
      type: 'dslRawChanged',
      setRaw: '{"a":2}',
      stateRaw: '{}',
    })
    expect(after2.pendingOps.filter((op) => op.type === 'dsl-raw')).toHaveLength(1)
    expect(after2.pendingOps).toEqual([{ type: 'dsl-raw', setRaw: '{"a":2}', stateRaw: '{}' }])
  })

  it('drops pending function/state-add/state-remove ops because dsl-raw is a full snapshot', () => {
    const seeded = makeState({
      pendingOps: [
        { type: 'function', field: 'user_id', payload: literalPayload },
        {
          type: 'state-add',
          sourceField: 'value',
          targetStatePath: 'entity.counter',
          mode: 'fn',
          functionExpression: 'now()',
        },
        { type: 'state-remove', statePath: 'entity.flag' },
        { type: 'wire-format-clear' },
        { type: 'source', source: 'previous-stage' },
      ],
    })
    const next = reducer(seeded, {
      type: 'dslRawChanged',
      setRaw: '{}',
      stateRaw: '{}',
    })
    expect(next.pendingOps).toEqual([
      { type: 'wire-format-clear' },
      { type: 'source', source: 'previous-stage' },
      { type: 'dsl-raw', setRaw: '{}', stateRaw: '{}' },
    ])
  })
})

// ── dslRawCleared ──

describe('dslRawCleared', () => {
  it('removes a queued dsl-raw op and leaves other ops untouched', () => {
    const seeded = makeState({
      pendingOps: [
        { type: 'source', source: 'previous-stage' },
        { type: 'dsl-raw', setRaw: '{}', stateRaw: '{}' },
      ],
    })
    const next = reducer(seeded, { type: 'dslRawCleared' })
    expect(next.pendingOps).toEqual([{ type: 'source', source: 'previous-stage' }])
  })

  it('is a no-op when no dsl-raw op is queued', () => {
    const seeded = makeState({
      pendingOps: [{ type: 'source', source: 'previous-stage' }],
    })
    const next = reducer(seeded, { type: 'dslRawCleared' })
    expect(next.pendingOps).toEqual(seeded.pendingOps)
  })
})

// ── dslRawErrorChanged ──

describe('dslRawErrorChanged', () => {
  it('flips the parse-error flag without touching pendingOps', () => {
    const seeded = makeState({
      pendingOps: [{ type: 'dsl-raw', setRaw: '{}', stateRaw: '{}' }],
    })
    const flipped = reducer(seeded, { type: 'dslRawErrorChanged', hasError: true })
    expect(flipped.dslRawHasParseError).toBe(true)
    expect(flipped.pendingOps).toEqual(seeded.pendingOps)
    const back = reducer(flipped, { type: 'dslRawErrorChanged', hasError: false })
    expect(back.dslRawHasParseError).toBe(false)
  })
})

// ── saveCompleted ──

describe('saveCompleted', () => {
  it('clears pendingOps, the saving flag, and dslRawHasParseError together', () => {
    const seeded = makeState({
      isSavingDraft: true,
      pendingOps: [{ type: 'dsl-raw', setRaw: '{}', stateRaw: '{}' }],
      dslRawHasParseError: true,
    })
    const next = reducer(seeded, { type: 'saveCompleted' })
    expect(next).toMatchObject({
      isSavingDraft: false,
      pendingOps: [],
      dslRawHasParseError: false,
    })
  })
})

// ── Mutual exclusion: function/state ops drop a queued dsl-raw ──

describe('queueFunctionApply / queueStateAdd / queueStateRemove', () => {
  it('queueFunctionApply drops a pending dsl-raw op to keep the snapshot consistent', () => {
    const seeded = makeState({
      pendingOps: [{ type: 'dsl-raw', setRaw: '{"a":1}', stateRaw: '{}' }],
    })
    const next = reducer(seeded, {
      type: 'queueFunctionApply',
      field: 'user_id',
      payload: literalPayload,
    })
    expect(next.pendingOps).toEqual([
      { type: 'function', field: 'user_id', payload: literalPayload },
    ])
  })

  it('queueStateAdd drops a pending dsl-raw op', () => {
    const seeded = makeState({
      pendingOps: [{ type: 'dsl-raw', setRaw: '{}', stateRaw: '{}' }],
    })
    const next = reducer(seeded, {
      type: 'queueStateAdd',
      sourceField: 'value',
      targetStatePath: 'entity.counter',
      mode: 'fn',
      functionExpression: 'now()',
    })
    expect(next.pendingOps.some((op) => op.type === 'dsl-raw')).toBe(false)
    expect(next.pendingOps.some((op) => op.type === 'state-add')).toBe(true)
  })

  it('queueStateRemove drops a pending dsl-raw op', () => {
    const seeded = makeState({
      pendingOps: [{ type: 'dsl-raw', setRaw: '{}', stateRaw: '{}' }],
    })
    const next = reducer(seeded, { type: 'queueStateRemove', statePath: 'entity.x' })
    expect(next.pendingOps.some((op) => op.type === 'dsl-raw')).toBe(false)
    expect(next.pendingOps).toContainEqual({ type: 'state-remove', statePath: 'entity.x' })
  })
})
