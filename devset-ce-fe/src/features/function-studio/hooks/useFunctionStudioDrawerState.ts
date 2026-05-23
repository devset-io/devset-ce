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
// useFunctionStudioDrawerState — orchestration hook
//
// Uses useReducer for all state. Side effects are handled
// synchronously in dispatchWithEffects (same pattern as
// FlowBuilderCanvas). Replaces the previous version that had
// 7 useState + 2 absorbed sub-hooks (stateTaskForm + wireFormat).
// ──────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { FunctionStudioDrawerProps } from '../types/function-studio-drawer.types.ts'
import type { FunctionStudioAction, FunctionStudioState } from '../state/FunctionStudio.types.ts'
import { reducer } from '../state/FunctionStudio.reducer.ts'
import { applyPendingOperations, buildDraftSelectedStageState, resetStateTaskForm } from '../utils/function-studio-draft.ts'
import { applyFnOverrides } from '../../flow-builder/config/node-palette.config.ts'
import type { FnOverrides } from '../../flow-builder/types.ts'
import { serializeBuilderValue } from '../utils/function-studio-drawer.utils.ts'
import { buildDefaultStateFnExpression } from '../utils/function-studio.utils.ts'
import { useFunctionStudioComputed } from '../../../shared/hooks/useFunctionStudioComputed.ts'
import {
  extractSchemaRequiredRootFields,
  extractSchemaRootFields,
  extractSchemaRootLiteralKindHints,
} from '../../flow-builder/utils/schema-extraction.utils.ts'

// ── Initial state factory ──

function createInitialState(props: {
  selectedEvent: string
  selectedSource: 'none' | 'previous-stage'
  selectedStageWireFormat: import('../../flow-builder/types.ts').StageWireFormat | null
}): FunctionStudioState {
  const wfEnabled = Boolean(props.selectedStageWireFormat)
  const wfValue =
    props.selectedStageWireFormat?.prefix.source === 'messagePrefix' &&
    typeof props.selectedStageWireFormat.prefix.value === 'number'
      ? String(props.selectedStageWireFormat.prefix.value)
      : ''
  return {
    scopePath: '',
    activeTaskTab: 'function',
    editorMode: 'function-studio',
    showDiscardConfirm: false,
    isSavingDraft: false,
    pendingOps: [],
    draftSelectedEvent: props.selectedEvent,
    draftSource: props.selectedSource,
    stateTaskForm: resetStateTaskForm(),
    wireFormatEnabled: wfEnabled,
    wireFormatPrefixSource: 'messagePrefix',
    wireFormatPrefixValue: wfValue,
    wireFormatPrefixValueError: null,
  }
}

// ── Hook ──

/** Manages the full drawer state for function studio including DSL and tasks. */
export const useFunctionStudioDrawerState = (props: FunctionStudioDrawerProps) => {
  const {
    isOpen,
    selectedNode,
    selectedEvent,
    selectedSource,
    selectedSchema,
    schemas,
    setEntries,
    studioSelectedField,
    setFieldOptions,
    schemaRootFields,
    schemaLiteralKindHints,
    schemaRequiredRootFields,
    selectedFieldExpression,
    selectedFieldMode,
    selectedFieldValue,
    selectedFieldRawValue,
    selectedStageState,
    workflowState,
    selectedStageWireFormat,
  } = props

  // ── Reducer ──

  const [state, dispatch] = useReducer(
    reducer,
    { selectedEvent, selectedSource, selectedStageWireFormat },
    createInitialState,
  )

  // ── Refs for stable access in dispatchWithEffects ──

  const stateRef = useRef(state)
  stateRef.current = state
  const propsRef = useRef(props)
  propsRef.current = props

  // ── Draft schema resolution ──
  // When the user changes the schema in the draft, we compute
  // schema metadata from the new schema (not the committed one).

  const draftSelectedSchema = schemas.find((s) => s.event === state.draftSelectedEvent) ?? selectedSchema
  const draftSchemaRootFields =
    state.draftSelectedEvent === selectedEvent ? schemaRootFields : extractSchemaRootFields(draftSelectedSchema)
  const draftSchemaLiteralKindHints =
    state.draftSelectedEvent === selectedEvent
      ? schemaLiteralKindHints
      : extractSchemaRootLiteralKindHints(draftSelectedSchema)
  const draftSchemaRequiredRootFields =
    state.draftSelectedEvent === selectedEvent
      ? schemaRequiredRootFields
      : extractSchemaRequiredRootFields(draftSelectedSchema)

  // ── Computed values (pure memos, no state) ──

  const computed = useFunctionStudioComputed({
    setEntries,
    scopePath: state.scopePath,
    pendingOps: state.pendingOps,
    selectedSchema: draftSelectedSchema,
    studioSelectedField,
    schemaRootFields: draftSchemaRootFields,
    schemaLiteralKindHints: draftSchemaLiteralKindHints,
    schemaRequiredRootFields: draftSchemaRequiredRootFields,
    setFieldOptions,
    selectedFieldMode,
    selectedFieldExpression,
    selectedFieldValue,
    selectedFieldRawValue,
    selectedStageState,
  })

  // ── Function builder key (used to reset FunctionBuilder on field change) ──

  const functionBuilderKey = [
    studioSelectedField ?? setFieldOptions[0] ?? '',
    computed.selectedFieldLiteralKindHint,
    computed.draftSelectedFieldExpression ?? '',
    computed.draftSelectedFieldMode ?? '',
    computed.draftSelectedFieldValue ?? '',
    serializeBuilderValue(computed.draftSelectedFieldRawValue),
  ].join('::')

  // ── Effects: sync state from parent props ──

  // Reset everything when the drawer opens/closes or node changes.
  // selectedStageWireFormat is serialized to avoid spurious resets caused by
  // unstable object references from the parent useMemo.
  const wireFormatKey = JSON.stringify(selectedStageWireFormat)
  useEffect(() => {
    dispatch({
      type: 'resetDraft',
      selectedEvent,
      selectedSource,
      wireFormat: selectedStageWireFormat,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedEvent, selectedNode?.id, selectedSource, wireFormatKey])

  // When there are no pending changes, keep draft in sync with props.
  useEffect(() => {
    if (!computed.hasPendingChanges) {
      dispatch({ type: 'syncDraftFromProps', selectedEvent, selectedSource })
    }
  }, [computed.hasPendingChanges, selectedEvent, selectedSource])

  // Auto-update state task form when the selected field changes.
  useEffect(() => {
    const leaf = studioSelectedField?.match(/[^.[\]]+$/)?.[0] ?? 'value'
    dispatch({
      type: 'syncStateTaskField',
      patch: {
        targetStatePath: `entity.${leaf}`,
        sourceField: studioSelectedField ?? state.stateTaskForm.sourceField,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioSelectedField])

  // Auto-correct source field if it's no longer in options.
  useEffect(() => {
    if (computed.sourceFieldPaths.size === 0 || state.stateTaskForm.mode === 'fn') return
    if (state.stateTaskForm.sourceField && !computed.sourceFieldPaths.has(state.stateTaskForm.sourceField)) {
      dispatch({ type: 'syncStateTaskField', patch: { sourceField: computed.sourceFieldOptions[0] } })
    }
  }, [computed.sourceFieldOptions, computed.sourceFieldPaths, state.stateTaskForm.mode, state.stateTaskForm.sourceField])

  // Auto-generate default fn expression when switching to fn mode.
  useEffect(() => {
    if (state.stateTaskForm.mode !== 'fn' || state.stateTaskForm.isFnDirty) return
    dispatch({
      type: 'syncStateTaskField',
      patch: {
        fnExpression: buildDefaultStateFnExpression(
          'add', state.stateTaskForm.sourceField, state.stateTaskForm.targetStatePath,
        ),
      },
    })
  }, [
    state.stateTaskForm.isFnDirty,
    state.stateTaskForm.mode,
    state.stateTaskForm.sourceField,
    state.stateTaskForm.targetStatePath,
  ])

  // Reset wire format when switching away from protobuf schema.
  useEffect(() => {
    if (draftSelectedSchema?.schemaType === 'protobuf') return
    dispatch({ type: 'wireFormatResetForNonProtobuf' })
  }, [draftSelectedSchema?.schemaType])

  // ──────────────────────────────────────────────────────────────
  // dispatchWithEffects — side effects handled synchronously.
  //
  // Actions that return `state` unchanged from the reducer
  // (requestClose, discardAndClose, save, selectField) would not
  // trigger a re-render, so useEffect can't handle them. We run
  // their side effects here instead.
  // ──────────────────────────────────────────────────────────────

  const dispatchWithEffects = useCallback((action: FunctionStudioAction): void => {
    const p = propsRef.current
    const s = stateRef.current

    // Dispatch to reducer for state changes
    dispatch(action)

    // Handle side effects synchronously
    switch (action.type) {
      case 'requestClose':
        if (s.pendingOps.length > 0) {
          dispatch({ type: 'showDiscardConfirm' })
        } else {
          p.onClose()
        }
        return

      case 'discardAndClose':
        dispatch({
          type: 'resetDraft',
          selectedEvent: p.selectedEvent,
          selectedSource: p.selectedSource,
          wireFormat: p.selectedStageWireFormat,
        })
        p.onClose()
        return

      case 'save':
        if (s.pendingOps.length === 0) return
        dispatch({ type: 'saveStarted' })
        void (async () => {
          try {
            await applyPendingOperations(s.pendingOps, {
              onSchemaChange: p.onSchemaChange,
              onSourceChange: p.onSourceChange,
              onApplyFunction: p.onApplyFunction,
              onAddStateMapping: p.onAddStateMapping,
              onRemoveStateMapping: p.onRemoveStateMapping,
              onSetStageWireFormat: (_source, value) => {
                p.onSetStageWireFormat({
                  type: 'binary-prefix',
                  prefix: { size: 2, source: 'messagePrefix', value: typeof value === 'number' ? value : 0 },
                })
              },
              onClearStageWireFormat: p.onClearStageWireFormat,
            })
            await new Promise<void>((resolve) => { window.setTimeout(resolve, 0) })
            await p.onSaveDraftChanges()
            dispatch({ type: 'saveCompleted' })
          } catch {
            // Intentional: save failure dispatches state update — error is shown via toast in saveWithToast
            dispatch({ type: 'saveFailed' })
          }
        })()
        return

      case 'commitAndResetStateTask': {
        const form = s.stateTaskForm
        const hasTarget = !!form.targetStatePath.trim()
        const canCommit =
          form.mode === 'assign'
            ? !!form.sourceField && hasTarget
            : form.mode === 'fn'
              ? hasTarget && !!form.fnExpression.trim()
              : hasTarget && !!form.whenCondition.trim() && !!form.whenValueRaw.trim()
        if (canCommit) {
          dispatch({
            type: 'queueStateAdd',
            sourceField: form.sourceField,
            targetStatePath: form.targetStatePath.trim(),
            mode: form.mode === 'fn' ? 'fn' : form.mode === 'when' ? 'when' : 'ref',
            functionExpression: form.fnExpression,
            whenValueRaw: form.whenValueRaw,
            whenHasDefault: form.whenHasDefault,
            whenDefaultRaw: form.whenDefaultRaw,
          })
        }
        return
      }

      case 'selectField':
        p.onSelectField(action.field)
        dispatch({ type: 'setActiveTaskTab', tab: 'function' })
        dispatch({ type: 'setEditorMode', mode: 'function-studio' })
        return

      default:
        return
    }
  }, [])

  // ── Draft DSL (committed state + pending function ops applied) ──
  // Used by the raw DSL panel so the user sees live updates as they
  // queue function ops — even before clicking Save.

  const draftStageDsl = useMemo(() => {
    const base = props.selectedStageDsl
    if (!base || state.pendingOps.length === 0) return base

    const pendingFnOverrides: FnOverrides = {}
    let hasFnOps = false
    state.pendingOps.forEach((op) => {
      if (op.type === 'function') {
        pendingFnOverrides[op.field] = op.payload
        hasFnOps = true
      }
    })

    const draftSet = hasFnOps
      ? applyFnOverrides(base.set ?? {}, pendingFnOverrides)
      : (base.set ?? {})
    const draftState = buildDraftSelectedStageState(base.state ?? {}, state.pendingOps)

    return { ...base, set: draftSet, state: draftState }
  }, [props.selectedStageDsl, state.pendingOps])

  // ── Public API ──
  // Returns everything needed by FunctionStudioDrawer and its children.

  return useMemo(() => ({
    // State
    state,
    dispatch: dispatchWithEffects,

    // Derived from draft schema
    draftSelectedSchema,

    // Computed values (from useFunctionStudioComputed)
    hasPendingChanges: computed.hasPendingChanges,
    draftSelectedFieldExpression: computed.draftSelectedFieldExpression,
    draftSelectedFieldMode: computed.draftSelectedFieldMode,
    draftSelectedFieldRawValue: computed.draftSelectedFieldRawValue,
    draftSelectedFieldValue: computed.draftSelectedFieldValue,
    draftSelectedStageState: computed.draftSelectedStageState,
    draftSetRootFields: computed.draftSetRootFields,
    functionFields: computed.functionFields,
    scopeTrail: computed.scopeTrail,
    selectedFieldLiteralKindHint: computed.selectedFieldLiteralKindHint,
    snapshotEntries: computed.snapshotEntries,
    sourceFieldOptions: computed.sourceFieldOptions,
    sourceFieldTree: computed.sourceFieldTree,
    workflowState,

    // Key for FunctionBuilder reset
    functionBuilderKey,

    // Draft DSL with pending ops applied
    draftStageDsl,
  }), [state, dispatchWithEffects, draftSelectedSchema, computed, functionBuilderKey, draftStageDsl, workflowState])
}

// Convenience type for the hook's return value.
export type FunctionStudioDrawerApi = ReturnType<typeof useFunctionStudioDrawerState>
