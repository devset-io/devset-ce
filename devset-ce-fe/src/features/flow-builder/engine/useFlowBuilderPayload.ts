/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect, useState } from 'react'
import type { DslPayload } from '../types'
import { msg } from '../../../shared/utils/i18n'

// ──────────────────────────────────────────────────────────────
// useFlowBuilderPayload
//
// Domain hook that manages the JSON payload editor state.
//
// The payload editor is a modal where the user can see and
// manually edit the final DSL JSON that will be sent to the
// backend. It works like a "draft" system:
//
//   1. By default, the editor auto-syncs with the builder
//      (nodes + overrides → payload → draft text).
//   2. Once the user types something, the draft becomes "dirty"
//      and stops auto-syncing (so manual edits aren't overwritten).
//   3. The user can reset the draft to re-sync with the builder.
//
// Parameters:
//   payload – the current DslPayload built from nodes + overrides.
//             This hook receives it as a prop (not computed internally)
//             because the payload depends on cross-domain data.
//
// Returns:
//   payloadDraft                – the current JSON string in the editor
//   isPayloadDraftDirty         – true if the user has manually edited the JSON
//   payloadDraftError           – JSON parse error message, or null
//   updatePayloadDraft(value)   – called on every keystroke in the editor
//   formatPayloadDraft()        – pretty-print the current draft
//   resetPayloadDraftFromBuilder() – discard manual edits and re-sync
// ──────────────────────────────────────────────────────────────

export function useFlowBuilderPayload(payload: DslPayload) {
  // The raw JSON string shown in the editor textarea.
  const [payloadDraft, setPayloadDraft] = useState('')

  // Tracks whether the user has made manual edits.
  // When true, auto-sync from the builder is paused.
  const [isPayloadDraftDirty, setIsPayloadDraftDirty] = useState(false)

  // If the user types invalid JSON, we store the parse error here.
  const [payloadDraftError, setPayloadDraftError] = useState<string | null>(null)

  // Auto-sync: whenever the builder payload changes AND the user
  // hasn't made manual edits, update the draft to match.
  useEffect(() => {
    if (isPayloadDraftDirty) {
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync draft with payload when user hasn't edited
    setPayloadDraft(JSON.stringify(payload, null, 2))
  }, [isPayloadDraftDirty, payload])

  // Called on every keystroke in the JSON editor.
  // Marks the draft as dirty and validates the JSON syntax.
  const updatePayloadDraft = (value: string) => {
    setPayloadDraft(value)
    setIsPayloadDraftDirty(true)
    try {
      JSON.parse(value)
      setPayloadDraftError(null)
    } catch (error) {
      setPayloadDraftError(error instanceof Error ? error.message : msg('Niepoprawny JSON', 'Invalid JSON'))
    }
  }

  // Pretty-print the current draft JSON (re-indent with 2 spaces).
  const formatPayloadDraft = () => {
    try {
      const parsed = JSON.parse(payloadDraft)
      setPayloadDraft(JSON.stringify(parsed, null, 2))
      setPayloadDraftError(null)
    } catch (error) {
      setPayloadDraftError(error instanceof Error ? error.message : msg('Niepoprawny JSON', 'Invalid JSON'))
    }
  }

  // Discard all manual edits and re-sync the draft from the builder.
  const resetPayloadDraftFromBuilder = () => {
    setPayloadDraft(JSON.stringify(payload, null, 2))
    setIsPayloadDraftDirty(false)
    setPayloadDraftError(null)
  }

  return {
    payloadDraft,
    isPayloadDraftDirty,
    payloadDraftError,
    updatePayloadDraft,
    formatPayloadDraft,
    resetPayloadDraftFromBuilder,
  }
}
