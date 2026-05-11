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
// useDispatchPayloadHandlers
//
// Callback functions that manipulate the payload (step-state)
// JSON. These are used by the payload adapter, the function
// studio, and the "beautify" button.
//
// Each handler reads the latest state from the stateRef to
// avoid stale-closure issues, then dispatches the appropriate
// actions to update the reducer.
// ──────────────────────────────────────────────────────────────

import { type Dispatch, type RefObject, useCallback } from 'react'
import { toast } from 'sonner'
import {
  buildCompleteSetTemplateFromSchema,
  extractSchemaRootFields,
} from '../../../../flow-builder/utils/schema-extraction.utils'
import { setValueAtPath } from '../../../../flow-builder/path-utils'
import type { FieldOverridePayload, LoadedSchema } from '../../../../flow-builder/types'
import { toOverrideValue } from '../../../message-dispatch.utils'
import type {
  MessageDispatchAction,
  MessageDispatchState,
} from '../state/MessageDispatch.types'

// ──────────────────────────────────────────────────────────────
// Types for the derived values this hook needs
// ──────────────────────────────────────────────────────────────

type PayloadHandlerDerived = {
  /** Whether the payload editor is enabled in proto mode. */
  isProtoPayloadEnabled: boolean
  /** The schema currently active for payload validation, or null. */
  activeSchemaForPayload: LoadedSchema | null
}

// ──────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────

export function useDispatchPayloadHandlers(
  dispatch: Dispatch<MessageDispatchAction>,
  stateRef: RefObject<MessageDispatchState>,
  derived: PayloadHandlerDerived,
  t: (key: string, options?: Record<string, string>) => string,
) {
  const { isProtoPayloadEnabled, activeSchemaForPayload } = derived

  // ── applySchemaTemplateFromSchema ──
  // Generates a JSON template from a LoadedSchema and puts it into
  // the step-state editor. Used when the user clicks "fill from schema".
  const applySchemaTemplateFromSchema = useCallback(
    (schema: LoadedSchema, showToast = true) => {
      const template = buildCompleteSetTemplateFromSchema(schema)
      if (Object.keys(template).length === 0) {
        throw new Error(t('dispatch.payload.cannotBuildTemplate'))
      }
      dispatch({ type: 'schemaTemplateApplied', stepStateRaw: JSON.stringify(template, null, 2) })
      if (showToast) toast.success(t('dispatch.payload.stateFilledFromSchema'))
    },
    [dispatch, t],
  )

  // ── handleStepStateRawChange ──
  // Called every time the user types in the raw payload editor.
  // In proto mode it validates that only schema-allowed fields are present.
  // Also clears studio overrides and send errors when the raw value changes.
  const handleStepStateRawChange = useCallback(
    (nextRaw: string) => {
      const s = stateRef.current
      if (s.contentMode === 'protobuf' && isProtoPayloadEnabled) {
        try {
          const parsed = JSON.parse(nextRaw)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const allowedFields = new Set(extractSchemaRootFields(activeSchemaForPayload ?? undefined))
            if (allowedFields.size > 0) {
              const invalidFields = Object.keys(parsed as Record<string, unknown>).filter((f) => !allowedFields.has(f)) // SAFETY: parsed confirmed as non-null object by typeof check above
              if (invalidFields.length > 0) {
                const message = t('dispatch.payload.protoEditHint')
                dispatch({ type: 'sendFailed', error: message })
                dispatch({ type: 'protoResyncRequired', value: true })
                dispatch({ type: 'payloadEditorModeChanged', mode: 'raw' })
                if (s.sendError !== message) toast.error(message)
                return
              }
              if (s.isProtoResyncRequired) {
                dispatch({ type: 'protoResyncRequired', value: false })
              }
            }
          }
        } catch {
          // Intentional: allow temporarily invalid JSON while the user is typing
        }
      }
      dispatch({ type: 'stepStateRawChanged', value: nextRaw })
      if (Object.keys(s.studioOverridesByField).length > 0) {
        dispatch({ type: 'studioStateReset' })
      }
      if (s.sendError) {
        dispatch({ type: 'sendErrorCleared' })
      }
    },
    [dispatch, stateRef, isProtoPayloadEnabled, activeSchemaForPayload, t],
  )

  // ── applyFunctionStudioOverride ──
  // Called when the user confirms an override from the function studio.
  // It reads the current payload JSON, sets the value at the given field
  // path, and dispatches the updated payload + the override record.
  const applyFunctionStudioOverride = useCallback(
    (field: string, override: FieldOverridePayload) => {
      try {
        const s = stateRef.current
        const currentParsed = s.stepStateRaw ? JSON.parse(s.stepStateRaw) : null
        const nextPayload: Record<string, unknown> =
          currentParsed && typeof currentParsed === 'object' && !Array.isArray(currentParsed)
            ? (JSON.parse(JSON.stringify(currentParsed)) as Record<string, unknown>) // SAFETY: deep clone of confirmed object preserves Record shape
            : {}
        setValueAtPath(nextPayload, field, toOverrideValue(override))
        dispatch({ type: 'stepStateRawChanged', value: JSON.stringify(nextPayload, null, 2) })
        dispatch({ type: 'studioOverrideApplied', field, payload: override })
        dispatch({ type: 'sendErrorCleared' })
        toast.success(t('dispatch.payload.appliedOverride', { field }))
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : t('dispatch.payload.cannotApplyOverride')
        dispatch({ type: 'sendFailed', error: message })
        toast.error(message)
      }
    },
    [dispatch, stateRef, t],
  )

  // ── beautifyStepStateRaw ──
  // Re-formats (pretty-prints) the raw step-state JSON. Delegates to
  // handleStepStateRawChange so that schema validation still runs.
  const beautifyStepStateRaw = useCallback(() => {
    try {
      const parsed = JSON.parse(stateRef.current.stepStateRaw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(t('dispatch.payload.rawDslMustBeObject'))
      }
      const beautified = JSON.stringify(parsed, null, 2)
      handleStepStateRawChange(beautified)
      toast.success(t('dispatch.payload.jsonFormatted'))
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : t('dispatch.payload.cannotFormatJson')
      dispatch({ type: 'sendFailed', error: message })
      toast.error(message)
    }
  }, [dispatch, stateRef, handleStepStateRawChange, t])

  return {
    applySchemaTemplateFromSchema,
    handleStepStateRawChange,
    applyFunctionStudioOverride,
    beautifyStepStateRaw,
  }
}
