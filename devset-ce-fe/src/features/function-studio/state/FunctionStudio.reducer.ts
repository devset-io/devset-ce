/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

// ──────────────────────────────────────────────────────────────
// FunctionStudio reducer
//
// Pure function — all state transitions for the function studio
// drawer. Zero side effects, zero API calls. Side effects are
// handled synchronously in the hook's dispatchWithEffects.
// ──────────────────────────────────────────────────────────────

import type { FunctionStudioAction, FunctionStudioState } from './FunctionStudio.types.ts'
import {
  DEFAULT_WHEN_CONDITION,
  DEFAULT_WHEN_VALUE,
  resetStateTaskForm,
} from '.././utils/function-studio-draft.ts'
import { buildDefaultStateFnExpression } from '.././utils/function-studio.utils.ts'
import type {StageWireFormat} from "../../flow-builder";

// ── Wire format helpers (pure, no side effects) ──

const parseWireFormatPrefixValue = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 65535) return null
  return Math.floor(parsed)
}

const readWireFormatDraft = (wireFormat: StageWireFormat | null) => ({
  enabled: Boolean(wireFormat),
  source: 'messagePrefix' as const,
  value:
    wireFormat?.prefix.source === 'messagePrefix' && typeof wireFormat.prefix.value === 'number'
      ? String(wireFormat.prefix.value)
      : '',
})

// ── Build a wire format pending operation from current draft values ──

const buildWireFormatSetOp = (prefixValue: string) => {
  const parsed = parseWireFormatPrefixValue(prefixValue)
  return {
    type: 'wire-format-set' as const,
    source: 'messagePrefix' as const,
    value: parsed ?? 0,
  }
}

// ── Remove existing wire format ops from pendingOps ──

const withoutWireFormatOps = (ops: FunctionStudioState['pendingOps']) =>
  ops.filter((op) => op.type !== 'wire-format-set' && op.type !== 'wire-format-clear')

// ── Remove existing dsl-raw ops from pendingOps (upsert semantics) ──

const withoutDslRawOps = (ops: FunctionStudioState['pendingOps']) =>
  ops.filter((op) => op.type !== 'dsl-raw')

// ── Remove function/state-add/state-remove ops from pendingOps ──
// dsl-raw represents a full snapshot of set+state, so once the user queues a
// raw-DSL draft the per-field overrides it would coexist with are subsumed —
// keeping them would let dsl-raw silently wipe a function override on save.

const withoutFunctionOrStateOps = (ops: FunctionStudioState['pendingOps']) =>
  ops.filter((op) => op.type !== 'function' && op.type !== 'state-add' && op.type !== 'state-remove')

// ── Reducer ──

/** Pure reducer for function studio state transitions. */
export function reducer(state: FunctionStudioState, action: FunctionStudioAction): FunctionStudioState {
  switch (action.type) {
    // ── UI controls ──

    case 'setScopePath':
      return { ...state, scopePath: action.value }

    case 'setActiveTaskTab':
      return { ...state, activeTaskTab: action.tab }

    case 'setEditorMode':
      return { ...state, editorMode: action.mode }

    case 'showDiscardConfirm':
      return { ...state, showDiscardConfirm: true }

    case 'hideDiscardConfirm':
      return { ...state, showDiscardConfirm: false }

    // ── Pending operations queue ──

    case 'queueFunctionApply':
      // Drop any pending dsl-raw op: the user just expressed a per-field
      // intent, which is incompatible with the full-snapshot semantics of
      // dsl-raw. Saving both would let dsl-raw silently overwrite this op.
      return {
        ...state,
        pendingOps: [
          ...withoutDslRawOps(state.pendingOps),
          { type: 'function', field: action.field, payload: action.payload },
        ],
      }

    case 'queueStateAdd':
      // Same rationale as queueFunctionApply: state-add is a per-path edit
      // that doesn't compose with a dsl-raw snapshot.
      return {
        ...state,
        pendingOps: [
          ...withoutDslRawOps(state.pendingOps),
          {
            type: 'state-add',
            sourceField: action.sourceField,
            targetStatePath: action.targetStatePath,
            mode: action.mode,
            functionExpression: action.functionExpression,
            whenValueRaw: action.whenValueRaw,
            whenHasDefault: action.whenHasDefault,
            whenDefaultRaw: action.whenDefaultRaw,
          },
        ],
      }

    case 'queueStateRemove':
      return {
        ...state,
        pendingOps: [...withoutDslRawOps(state.pendingOps), { type: 'state-remove', statePath: action.statePath }],
      }

    // ── Schema/source draft ──

    case 'schemaChangeDraft': {
      const normalizedEvent = action.event.trim()
      if (!normalizedEvent) return state
      const withoutSchema = state.pendingOps.filter((op) => op.type !== 'schema')
      const nextOps = normalizedEvent === action.selectedEvent
        ? withoutSchema
        : [...withoutSchema, { type: 'schema' as const, event: normalizedEvent }]
      return {
        ...state,
        draftSelectedEvent: normalizedEvent,
        scopePath: '',
        pendingOps: nextOps,
      }
    }

    case 'sourceChangeDraft':
      return {
        ...state,
        draftSource: action.source,
        pendingOps: [...state.pendingOps, { type: 'source', source: action.source }],
      }

    // ── State task form ──

    case 'stateTaskFormChanged':
      return {
        ...state,
        stateTaskForm: { ...state.stateTaskForm, ...action.patch },
      }

    case 'stateTaskModeChanged': {
      const form = { ...state.stateTaskForm, mode: action.mode }
      if (action.mode === 'fn') {
        form.sourceField = ''
        if (!state.stateTaskForm.fnExpression.trim()) {
          form.fnExpression = buildDefaultStateFnExpression(
            'add', state.stateTaskForm.sourceField, state.stateTaskForm.targetStatePath,
          )
        }
      } else if (action.mode === 'when') {
        form.sourceField = ''
        if (!state.stateTaskForm.whenCondition.trim()) form.whenCondition = DEFAULT_WHEN_CONDITION
        if (!state.stateTaskForm.whenValueRaw.trim()) form.whenValueRaw = DEFAULT_WHEN_VALUE
      } else if (!state.stateTaskForm.sourceField && action.sourceFieldOptions[0]) {
        form.sourceField = action.sourceFieldOptions[0]
      }
      return { ...state, stateTaskForm: form }
    }

    case 'commitAndResetStateTask':
      return { ...state, stateTaskForm: resetStateTaskForm() }

    // ── Wire format ──

    case 'wireFormatEnabledChanged': {
      if (!action.enabled) {
        return {
          ...state,
          wireFormatEnabled: false,
          wireFormatPrefixValueError: null,
          pendingOps: [...withoutWireFormatOps(state.pendingOps), { type: 'wire-format-clear' }],
        }
      }
      const parsed = parseWireFormatPrefixValue(action.currentPrefixValue)
      return {
        ...state,
        wireFormatEnabled: true,
        wireFormatPrefixValueError: null,
        wireFormatPrefixValue: parsed === null ? '0' : state.wireFormatPrefixValue,
        pendingOps: [
          ...withoutWireFormatOps(state.pendingOps),
          buildWireFormatSetOp(parsed === null ? '0' : action.currentPrefixValue),
        ],
      }
    }

    case 'wireFormatSourceChanged': {
      const parsed = parseWireFormatPrefixValue(action.currentPrefixValue)
      const nextState: FunctionStudioState = {
        ...state,
        wireFormatPrefixSource: action.source,
        wireFormatPrefixValueError: null,
        wireFormatPrefixValue: parsed === null ? '0' : state.wireFormatPrefixValue,
      }
      if (action.enabled) {
        nextState.pendingOps = [
          ...withoutWireFormatOps(state.pendingOps),
          buildWireFormatSetOp(parsed === null ? '0' : action.currentPrefixValue),
        ]
      }
      return nextState
    }

    case 'wireFormatPrefixValueChanged': {
      const parsed = parseWireFormatPrefixValue(action.value)
      const nextState: FunctionStudioState = {
        ...state,
        wireFormatPrefixValue: action.value,
        wireFormatPrefixValueError: parsed === null ? 'invalid-range' : null,
      }
      if (parsed !== null && action.enabled) {
        nextState.pendingOps = [
          ...withoutWireFormatOps(state.pendingOps),
          { type: 'wire-format-set', source: 'messagePrefix', value: parsed },
        ]
      }
      return nextState
    }

    case 'wireFormatResetForNonProtobuf':
      return {
        ...state,
        wireFormatEnabled: false,
        wireFormatPrefixSource: 'messagePrefix',
        wireFormatPrefixValue: '',
        wireFormatPrefixValueError: null,
        pendingOps: withoutWireFormatOps(state.pendingOps),
      }

    // ── Raw DSL draft ──

    case 'dslRawChanged':
      // dsl-raw is a full set+state snapshot — drop any pending function or
      // state-add/remove ops because they would either be silently
      // overwritten on save or, if applied after dsl-raw, contradict what the
      // user typed in raw DSL.
      return {
        ...state,
        pendingOps: [
          ...withoutFunctionOrStateOps(withoutDslRawOps(state.pendingOps)),
          { type: 'dsl-raw', setRaw: action.setRaw, stateRaw: action.stateRaw },
        ],
      }

    case 'dslRawCleared':
      return {
        ...state,
        pendingOps: withoutDslRawOps(state.pendingOps),
      }

    case 'dslRawErrorChanged':
      return {
        ...state,
        dslRawHasParseError: action.hasError,
      }

    // ── Lifecycle ──

    case 'resetDraft': {
      const wfDraft = readWireFormatDraft(action.wireFormat)
      return {
        ...state,
        scopePath: '',
        activeTaskTab: 'function',
        editorMode: 'function-studio',
        showDiscardConfirm: false,
        isSavingDraft: false,
        pendingOps: [],
        draftSelectedEvent: action.selectedEvent,
        draftSource: action.selectedSource,
        stateTaskForm: resetStateTaskForm(),
        wireFormatEnabled: wfDraft.enabled,
        wireFormatPrefixSource: wfDraft.source,
        wireFormatPrefixValue: wfDraft.value,
        wireFormatPrefixValueError: null,
        dslRawHasParseError: false,
      }
    }

    case 'saveStarted':
      return { ...state, isSavingDraft: true }

    case 'saveCompleted':
      return { ...state, isSavingDraft: false, pendingOps: [], dslRawHasParseError: false }

    case 'saveFailed':
      return { ...state, isSavingDraft: false }

    // ── Sync from parent props ──

    case 'syncDraftFromProps':
      return {
        ...state,
        draftSelectedEvent: action.selectedEvent,
        draftSource: action.selectedSource,
      }

    case 'syncStateTaskField':
      return {
        ...state,
        stateTaskForm: { ...state.stateTaskForm, ...action.patch },
      }

    // ── Side-effect-only actions (handled in dispatchWithEffects) ──
    case 'requestClose':
    case 'discardAndClose':
    case 'save':
    case 'selectField':
      return state

    default:
      return state
  }
}
