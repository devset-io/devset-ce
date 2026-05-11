/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useBeforeUnload } from 'react-router-dom'
import { toast } from 'sonner'
import { useI18n } from '../../../core/i18n/I18nProvider'
import { createWorkflow, updateWorkflow } from '../services/workflow-library.service'
import type { DslPayload } from '../types'

type UseFlowBuilderPersistenceParams = {
  payload: DslPayload
  hasUnsavedSidebarChanges: boolean
  isPayloadDraftDirty: boolean
  initiallyPersisted: boolean
  onPersistedWorkflowIdChange: (workflowId: string) => void
}

type UseFlowBuilderPersistenceResult = {
  isPersistedWorkflow: boolean
  hasUnsavedChanges: boolean
  saveWithToast: () => Promise<void>
}

export function useFlowBuilderPersistence({
  payload,
  hasUnsavedSidebarChanges,
  isPayloadDraftDirty,
  initiallyPersisted,
  onPersistedWorkflowIdChange,
}: UseFlowBuilderPersistenceParams): UseFlowBuilderPersistenceResult {
  const { t } = useI18n()
  const [isPersistedWorkflow, setIsPersistedWorkflow] = useState(Boolean(initiallyPersisted))
  const [lastSavedPayloadJson, setLastSavedPayloadJson] = useState(() => JSON.stringify(payload))
  const latestPayloadRef = useRef(payload)
  useEffect(() => { latestPayloadRef.current = payload }, [payload])
  const currentPayloadJson = JSON.stringify(payload)
  const hasDslChanges = currentPayloadJson !== lastSavedPayloadJson
  const hasUnsavedChanges = hasUnsavedSidebarChanges || isPayloadDraftDirty || hasDslChanges

  const saveDefinition = useCallback(async (): Promise<DslPayload> => {
    const latestPayload = latestPayloadRef.current
    if (isPersistedWorkflow) {
      await updateWorkflow(latestPayload.id, latestPayload)
      return latestPayload
    }
    const created = await createWorkflow(latestPayload)
    const persistedPayload: DslPayload = {
      ...latestPayload,
      id: created.id && created.id.trim() ? created.id : latestPayload.id,
    }
    if (persistedPayload.id !== latestPayload.id) {
      onPersistedWorkflowIdChange(persistedPayload.id)
    }
    setIsPersistedWorkflow(true)
    return persistedPayload
  }, [isPersistedWorkflow, onPersistedWorkflowIdChange])

  const saveWithToast = useCallback(async () => {
    try {
      const savedPayload = await saveDefinition()
      setLastSavedPayloadJson(JSON.stringify(savedPayload))
      toast.success(t('flow.save.success'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('flow.save.failed'))
      throw error
    }
  }, [saveDefinition, t])

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent<boolean>('flow-builder-unsaved-change', {
        detail: hasUnsavedChanges,
      }),
    )
  }, [hasUnsavedChanges])

  useEffect(
    () => () => {
      window.dispatchEvent(
        new CustomEvent<boolean>('flow-builder-unsaved-change', {
          detail: false,
        }),
      )
    },
    [],
  )

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!hasUnsavedChanges) {
          return
        }
        event.preventDefault()
        event.returnValue = ''
      },
      [hasUnsavedChanges],
    ),
  )

  return {
    isPersistedWorkflow,
    hasUnsavedChanges,
    saveWithToast,
  }
}
