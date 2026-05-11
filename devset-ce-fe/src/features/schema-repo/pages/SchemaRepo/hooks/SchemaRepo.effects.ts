/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect } from 'react'
import type { RefObject } from 'react'
import { toast } from 'sonner'
import { requireTrimmed } from '../../../../../shared/utils/string-guards'
import {
  createSchemaRepoSchema,
  deleteSchemaRepoSchema,
  loadSchemaRepoSchemas,
  replaceSchemaRepoSchema,
} from '../../../services/schemaRepo.service'
import type { CreateSchemaPayload, EditorSurface, SchemaPayload, SchemaRepoLabels } from '../../../types/schemaRepo.types'
import { normalizeError } from '../../../../../shared/utils/error'
import type { SchemaRepoAction, SchemaRepoState } from '../state/SchemaRepo.types'

function parseSchemaPayload(surface: EditorSurface, jsonDraft: string, protoDraft: string, labels: SchemaRepoLabels): SchemaPayload {
  if (surface === 'protobuf') {
    requireTrimmed(protoDraft, labels.protoNonEmpty)
    return protoDraft
  }

  const parsedSchema: unknown = JSON.parse(jsonDraft)
  if (!parsedSchema || typeof parsedSchema !== 'object' || Array.isArray(parsedSchema)) {
    throw new Error(labels.jsonMustBeObject)
  }

  return parsedSchema as Record<string, unknown> // SAFETY: parsedSchema confirmed as non-null non-array object by preceding guards
}

function resolveSelectedSchemaId(
  current: string,
  preferred: string | undefined,
  schemas: { id: string }[],
): string {
  if (preferred && schemas.some((item) => item.id === preferred)) {
    return preferred
  }
  if (current && schemas.some((item) => item.id === current)) {
    return current
  }
  return schemas[0]?.id ?? ''
}

export function useSchemaRepoEffects(
  state: SchemaRepoState,
  dispatch: (action: SchemaRepoAction) => void,
  lastAction: RefObject<SchemaRepoAction | null>,
  handledAction: RefObject<SchemaRepoAction | null>,
  labels: SchemaRepoLabels,
): void {
  useEffect(() => {
    const action = lastAction.current
    if (!action || action === handledAction.current) return
    handledAction.current = action

    switch (action.type) {
      case 'init':
        void loadSchemas()
        return
      case 'saveSchema':
        void saveSchema()
        return
      case 'deleteSchema':
        void deleteSchema(action.schemaId)
        return
    }
  })

  useEffect(() => {
    if (!state.openMenuKey) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('.schema-tree-menu-wrap')) {
        return
      }

      dispatch({ type: 'closeMenu' })
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [state.openMenuKey, dispatch])

  async function loadSchemas(preferredSchemaId?: string): Promise<void> {
    try {
      const data = await loadSchemaRepoSchemas({ errorLabel: labels.schemaLoadError })
      const selectedSchemaId = resolveSelectedSchemaId(state.selectedSchemaId, preferredSchemaId, data)
      dispatch({ type: 'schemasRefreshed', schemas: data, selectedSchemaId })
    } catch (error) {
      dispatch({ type: 'loadFailed', error: normalizeError(error, labels.schemaLoadError) })
    }
  }

  async function saveSchema(): Promise<void> {
    try {
      const requestType = state.editorSurface === 'protobuf' ? 'protobuf' : 'json'
      const schemaPayload = parseSchemaPayload(state.editorSurface, state.schemaJsonDraft, state.schemaProtoDraft, labels)

      if (state.editorMode === 'create') {
        const newSchemaId = requireTrimmed(state.schemaIdDraft, labels.schemaIdRequired)

        const payload: CreateSchemaPayload = {
          id: newSchemaId,
          type: requestType,
          schema: schemaPayload,
        }
        const created = await createSchemaRepoSchema(payload, { errorLabel: labels.saveFailed })
        const data = await loadSchemaRepoSchemas({ errorLabel: labels.schemaLoadError })
        const selectedSchemaId = resolveSelectedSchemaId(state.selectedSchemaId, created.id, data)
        dispatch({ type: 'saveSucceeded' })
        dispatch({ type: 'schemasRefreshed', schemas: data, selectedSchemaId })
        return
      }

      const selectedSchema = state.schemas.find((item) => item.id === state.selectedSchemaId) ?? null
      if (!selectedSchema) {
        throw new Error(labels.noSchemaForEdit)
      }

      const updated = await replaceSchemaRepoSchema(
        selectedSchema.id,
        {
          type: requestType,
          schema: schemaPayload,
        },
        { errorLabel: labels.saveFailed },
      )
      const data = await loadSchemaRepoSchemas({ errorLabel: labels.schemaLoadError })
      const selectedSchemaId = resolveSelectedSchemaId(state.selectedSchemaId, updated.id, data)
      dispatch({ type: 'saveSucceeded' })
      dispatch({ type: 'schemasRefreshed', schemas: data, selectedSchemaId })
    } catch (error) {
      toast.error(normalizeError(error, labels.saveFailed))
      dispatch({ type: 'saveFailed' })
    }
  }

  async function deleteSchema(schemaId: string): Promise<void> {
    try {
      await deleteSchemaRepoSchema(schemaId, { errorLabel: labels.deleteFailed })
      if (state.selectedSchemaId === schemaId) {
        dispatch({ type: 'deleteSucceeded' })
      } else {
        dispatch({ type: 'deleteSucceeded' })
      }
      const data = await loadSchemaRepoSchemas({ errorLabel: labels.schemaLoadError })
      const selectedSchemaId = resolveSelectedSchemaId(state.selectedSchemaId, undefined, data)
      dispatch({ type: 'schemasRefreshed', schemas: data, selectedSchemaId })
    } catch (error) {
      toast.error(normalizeError(error, labels.deleteFailed))
      dispatch({ type: 'deleteFailed' })
    }
  }
}
