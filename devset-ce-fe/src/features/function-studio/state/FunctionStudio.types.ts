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
// FunctionStudio types
//
// State, Action union, and ViewData for the function studio
// drawer feature. All state transitions go through the reducer
// via dispatched actions.
// ───────────────────────────────────────────────────────���──────

import type { FieldOverridePayload, StageWireFormat } from '../../flow-builder/types'
import type { PendingOperation, SourceMode, StateTaskForm, StateTaskMode } from '../utils/function-studio-draft'

// ──────────────────────────────────────────────────────────────
// State — single source of truth for the function studio drawer.
// Previously scattered across 5 hooks with 12+ useState calls.
// ──────────────────────────────────────────────────────────────

/** Full state shape for the function studio feature. */
export interface FunctionStudioState {
  // UI controls
  scopePath: string                          // current drill-down path in the field tree
  activeTaskTab: 'function' | 'state'        // which task panel tab is active
  editorMode: 'function-studio' | 'raw'      // visual builder vs raw JSON editor
  showDiscardConfirm: boolean                // discard confirmation modal visible
  isSavingDraft: boolean                     // save operation in progress

  // Draft overrides — queued changes, batch-applied on save.
  // This is the core pattern: user makes changes → operations are
  // queued in pendingOps → on save, they're applied to builderState.
  pendingOps: PendingOperation[]
  draftSelectedEvent: string                 // draft schema event (may differ from committed)
  draftSource: SourceMode                    // draft source mode (none | previous-stage)

  // State task form — the form for creating state mappings
  // (absorbed from useFunctionStudioStateTaskForm)
  stateTaskForm: StateTaskForm

  // Wire format draft — protobuf message framing config
  // (absorbed from useFunctionStudioWireFormatDraft)
  wireFormatEnabled: boolean
  wireFormatPrefixSource: 'messagePrefix'
  wireFormatPrefixValue: string
  wireFormatPrefixValueError: 'invalid-range' | null
}

// ──────────────────────────────────────────────────────────────
// Action union — every user interaction dispatches one of these.
// The reducer handles pure state transitions; the hook handles
// side effects (API calls, parent callbacks).
// ──────────────────────────────────────────────────────────────

/** Discriminated union of all function studio actions. */
export type FunctionStudioAction =
  // --- UI controls ---
  | { type: 'setScopePath'; value: string }
  | { type: 'setActiveTaskTab'; tab: 'function' | 'state' }
  | { type: 'setEditorMode'; mode: 'function-studio' | 'raw' }
  | { type: 'showDiscardConfirm' }
  | { type: 'hideDiscardConfirm' }

  // --- Pending operations queue ---
  | { type: 'queueFunctionApply'; field: string; payload: FieldOverridePayload }
  | {
      type: 'queueStateAdd'
      sourceField: string
      targetStatePath: string
      mode: 'ref' | 'fn' | 'when'
      functionExpression?: string
      whenValueRaw?: string
      whenHasDefault?: boolean
      whenDefaultRaw?: string
    }
  | { type: 'queueStateRemove'; statePath: string }

  // --- Schema/source draft ---
  // selectedEvent is the committed value from builderState,
  // used to detect whether this is a real change or a reset.
  | { type: 'schemaChangeDraft'; event: string; selectedEvent: string }
  | { type: 'sourceChangeDraft'; source: SourceMode }

  // --- State task form ---
  | { type: 'stateTaskFormChanged'; patch: Partial<StateTaskForm> }
  | { type: 'stateTaskModeChanged'; mode: StateTaskMode; sourceFieldOptions: string[] }
  | { type: 'commitAndResetStateTask' }

  // --- Wire format ---
  | { type: 'wireFormatEnabledChanged'; enabled: boolean; currentPrefixValue: string }
  | { type: 'wireFormatSourceChanged'; source: 'messagePrefix'; enabled: boolean; currentPrefixValue: string }
  | { type: 'wireFormatPrefixValueChanged'; value: string; enabled: boolean }
  | { type: 'wireFormatResetForNonProtobuf' }

  // --- Lifecycle ---
  | { type: 'resetDraft'; selectedEvent: string; selectedSource: SourceMode; wireFormat: StageWireFormat | null }
  | { type: 'saveStarted' }
  | { type: 'saveCompleted' }
  | { type: 'saveFailed' }

  // --- Sync from parent props (dispatched by effects) ---
  | { type: 'syncDraftFromProps'; selectedEvent: string; selectedSource: SourceMode }
  | { type: 'syncStateTaskField'; patch: Partial<StateTaskForm> }

  // --- Side-effect-only actions (reducer returns state unchanged,
  //     handled synchronously in dispatchWithEffects) ---
  | { type: 'requestClose' }
  | { type: 'discardAndClose' }
  | { type: 'save' }
  | { type: 'selectField'; field: string }
