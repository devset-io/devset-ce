/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { Dispatch, RefObject } from 'react'
import { toast } from 'sonner'
import { useI18n } from '../../../../../../core/i18n/I18nProvider'
import type { LoadedSchema } from '../../../../../flow-builder/types'
import type { MessageDispatchAction, MessageDispatchState, RepoProtoSchema, SchemaSource } from '../../state/MessageDispatch.types'

type UseDispatchSchemaActionsParams = {
  dispatch: Dispatch<MessageDispatchAction>
  stateRef: RefObject<MessageDispatchState>
  derived: {
    findRepoProtoSchema: (schemaId: string) => RepoProtoSchema | null
    availableSchemas: LoadedSchema[]
  }
  applySchemaTemplateFromSchema: (schema: LoadedSchema, showToast?: boolean) => void
}

export function useDispatchSchemaActions({
  dispatch,
  stateRef,
  derived,
  applySchemaTemplateFromSchema,
}: UseDispatchSchemaActionsParams) {
  const { t } = useI18n()

  const failSend = (message: string) => {
    dispatch({ type: 'sendFailed', error: message })
    toast.error(message)
  }

  const applyProtoSchemaBaseFromRaw = (
    nextProtoSchema: string,
    sourceMode: SchemaSource,
    sourceLabel: string,
    schemaId?: string,
  ) => {
    if (!nextProtoSchema.trim()) {
      failSend(t('dispatch.schema.protoEmpty'))
      return
    }

    if (schemaId) {
      dispatch({ type: 'selectedSchemaIdChanged', id: schemaId })
      dispatch({ type: 'protoSchemaChoiceChanged', value: schemaId })
    } else {
      dispatch({ type: 'protoSchemaChoiceChanged', value: '__manual__' })
    }

    dispatch({ type: 'schemaSourceChanged', source: sourceMode })
    dispatch({ type: 'customProtoSchemaChanged', value: nextProtoSchema })
    dispatch({ type: 'appliedProtoSchemaChanged', value: nextProtoSchema })
    try {
      applySchemaTemplateFromSchema(
        {
          id: 'dispatch-protobuf-base',
          version: 1,
          event: 'dispatch-protobuf-base',
          fileName: 'dispatch-protobuf-base.proto',
          schemaType: 'protobuf',
          schema: nextProtoSchema,
        },
        false,
      )
      dispatch({ type: 'sendErrorCleared' })
      dispatch({ type: 'protoResyncRequired', value: false })
      dispatch({ type: 'protoBaseApplied' })
      dispatch({ type: 'payloadEditorModeChanged', mode: 'raw' })
      if (!stateRef.current.isProtoSchemaCollapsed) {
        dispatch({ type: 'protoSchemaCollapseToggled' })
      }
      if (stateRef.current.isProtoSchemasOpen) {
        dispatch({ type: 'protoSchemasToggled' })
      }
      toast.success(t('dispatch.schema.baseSet', { source: sourceLabel }))
    } catch (nextError) {
      failSend(nextError instanceof Error ? nextError.message : t('dispatch.schema.cannotApplyBase'))
    }
  }

  const applyProtoSchemaBase = () => {
    const state = stateRef.current
    let sourceMode: SchemaSource = 'none'
    let sourceLabel = t('dispatch.schema.sampleProto')
    let schemaId: string | undefined

    if (state.protoSchemaChoice !== '__manual__') {
      const selectedSchema = derived.findRepoProtoSchema(state.protoSchemaChoice)
      if (!selectedSchema) {
        sourceMode = 'none'
        sourceLabel = t('dispatch.schema.customProto')
      } else {
        sourceMode = 'repo'
        sourceLabel = selectedSchema.id
        schemaId = selectedSchema.id
      }
    }

    applyProtoSchemaBaseFromRaw(state.customProtoSchemaRaw, sourceMode, sourceLabel, schemaId)
  }

  const applyProtoSchemaFromRepo = (schemaId: string) => {
    const selectedSchema = derived.findRepoProtoSchema(schemaId)
    if (!selectedSchema) {
      failSend(t('dispatch.schema.repoProtoUnavailable'))
      return
    }
    dispatch({ type: 'schemaSourceChanged', source: 'repo' })
    dispatch({ type: 'selectedSchemaIdChanged', id: selectedSchema.id })
    dispatch({ type: 'protoSchemaChoiceChanged', value: selectedSchema.id })
    dispatch({ type: 'customProtoSchemaChanged', value: selectedSchema.schema })
    if (stateRef.current.isProtoSchemaCollapsed) {
      dispatch({ type: 'protoSchemaCollapseToggled' })
    }
    if (stateRef.current.isProtoSchemasOpen) {
      dispatch({ type: 'protoSchemasToggled' })
    }
    dispatch({ type: 'sendErrorCleared' })
    toast.success(
      t('dispatch.schema.repoProtoLoaded', { schemaId: selectedSchema.id }),
    )
  }

  const importJsonSchemaFromRepo = (schemaId: string) => {
    const selectedSchema =
      derived.availableSchemas.find((schema) => schema.id === schemaId && schema.schemaType === 'json') ?? null
    if (!selectedSchema) {
      failSend(t('dispatch.schema.repoJsonUnavailable'))
      return
    }
    dispatch({ type: 'schemaSourceChanged', source: 'repo' })
    dispatch({ type: 'selectedSchemaIdChanged', id: selectedSchema.id })
    try {
      applySchemaTemplateFromSchema(selectedSchema, false)
      dispatch({ type: 'sendErrorCleared' })
      if (stateRef.current.isJsonSchemasOpen) {
        dispatch({ type: 'jsonSchemasToggled' })
      }
      toast.success(t('dispatch.schema.repoJsonImported', { schemaId: selectedSchema.id }))
    } catch (nextError) {
      failSend(nextError instanceof Error ? nextError.message : t('dispatch.schema.cannotImport'))
    }
  }

  return {
    applyProtoSchemaBase,
    applyProtoSchemaFromRepo,
    importJsonSchemaFromRepo,
  }
}
