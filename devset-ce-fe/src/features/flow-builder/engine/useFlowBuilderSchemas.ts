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
import { loadWorkflowSchemas } from '../services/schema-loader.service'
import type { LoadedSchema } from '../types'
import { msg } from '../../../shared/utils/i18n'

// ──────────────────────────────────────────────────────────────
// useFlowBuilderSchemas
//
// Domain hook responsible for loading event schemas from the
// backend on mount. Schemas describe the shape of data that
// each pipeline step can produce/consume (JSON Schema or Protobuf).
//
// This hook is independent – it has no dependencies on other
// domain hooks, so it can be tested or reused in isolation.
//
// Returns:
//   schemas          – the full list of loaded schemas
//   isSchemaLoading  – true while the API call is in progress
//   schemaError      – error message if loading failed, null otherwise
//   availableEvents  – short list of event names (derived from schemas)
// ──────────────────────────────────────────────────────────────

export function useFlowBuilderSchemas() {
  // List of schemas fetched from the backend (starts empty).
  const [schemas, setSchemas] = useState<LoadedSchema[]>([])

  // Loading indicator – starts as true because we fetch on mount.
  const [isSchemaLoading, setIsSchemaLoading] = useState(true)

  // If loading fails, we store the error message here.
  const [schemaError, setSchemaError] = useState<string | null>(null)

  // Derived value: flat list of event names for dropdown menus.
  const availableEvents = schemas.map(({ event }) => event)

  // Fetch schemas once when the component mounts.
  // The `cancelled` flag prevents setting state after unmount
  // (avoids the React "state update on unmounted component" warning).
  useEffect(() => {
    let cancelled = false

    const loadSchemas = async () => {
      setIsSchemaLoading(true)
      setSchemaError(null)
      try {
        const result = await loadWorkflowSchemas()
        if (!cancelled) {
          setSchemas(result)
        }
      } catch (error) {
        if (!cancelled) {
          setSchemaError(error instanceof Error ? error.message : msg('Nie mozna zaladowac schematow', 'Cannot load schemas'))
        }
      } finally {
        if (!cancelled) {
          setIsSchemaLoading(false)
        }
      }
    }

    void loadSchemas()
    return () => {
      cancelled = true
    }
  }, [])

  return { schemas, isSchemaLoading, schemaError, availableEvents }
}
