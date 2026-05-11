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
import { setActiveConnector } from '../../../../../../shared/services/kafka-connectors.service'
import { trimOr } from '../../../../../../shared/utils/string-normalization'
import {
  DEFAULT_EVENT,
  DEFAULT_STAGE,
} from '../../../../message-dispatch.constants'
import type {
  SingleRequestPayload,
  SingleStepHistoryEntry,
} from '../../../../services/message-dispatch.service'
import type { RepoProtoSchema } from '../../../../types'
import type { MessageDispatchAction, MessageDispatchState } from '../../state/MessageDispatch.types'
import { toHeaderRows } from '../../state/MessageDispatch.reducer'
import {
  resolveExecutionCount,
  toJsonSchemaHydrationPatch,
  toProtobufSchemaHydrationPatch,
  toWireFormatPatch,
} from '../utils/dispatchExecution.utils'

type UseDispatchDraftHydrationParams = {
  dispatch: Dispatch<MessageDispatchAction>
  stateRef: RefObject<MessageDispatchState>
  findRepoProtoSchema: (schemaId: string) => RepoProtoSchema | null
}

export function useDispatchDraftHydration({
  dispatch,
  stateRef,
  findRepoProtoSchema,
}: UseDispatchDraftHydrationParams) {
  const { t } = useI18n()

  const loadHistoryEntryToDispatch = (entry: SingleStepHistoryEntry) => {
    const isProtobuf = entry.contentType === 'application/x-protobuf'
    const connectorExists = stateRef.current.connectors.some(
      (connector) => connector.name === entry.producerName,
    )

    if (connectorExists) {
      setActiveConnector(entry.producerName)
    }

    const schemaPatch = isProtobuf
      ? toProtobufSchemaHydrationPatch({
          schemaId: entry.schemaId,
          protoSchema: entry.protoSchema,
          repoFallbackSchemaId: entry.schemaId ?? undefined,
          findRepoProtoSchema,
        })
      : toJsonSchemaHydrationPatch({
          schemaId: entry.schemaId,
          useRepoSchema: Boolean(entry.schemaId),
        })

    const warnProtoMissing =
      isProtobuf &&
      !schemaPatch.isProtoBaseApplied &&
      !schemaPatch.appliedProtoSchemaRaw

    dispatch({
      type: 'draftHydratedFromHistory',
      patch: {
        selectedConnectorName: entry.producerName,
        contentMode: isProtobuf ? 'protobuf' : 'json',
        topicRaw: entry.topic ?? '',
        routingKeyRaw: entry.routingKey ?? '',
        exchangeRaw: entry.exchange ?? '',
        kafkaKeyRaw: entry.key ?? '',
        kafkaKeyKind: 'literal',
        kafkaHeadersRows: toHeaderRows(entry.headers),
        stepStateRaw: JSON.stringify(entry.state, null, 2),
        loadedHistoryMetadata: {
          workflowId: entry.workflowId,
          executions: resolveExecutionCount(entry.executions),
          stage: entry.stage || DEFAULT_STAGE,
          event: entry.event || DEFAULT_EVENT,
          headers: entry.headers ?? {},
          workflowState: entry.workflowState,
          protobufRootMessage: entry.protobufRootMessage ?? undefined,
        },
        loadedFromHistoryId: entry.id,
        payloadEditorMode: 'raw',
        studioOverridesByField: {},
        studioSelectedField: '',
        studioScopePath: '',
        isProtoSchemasOpen: false,
        isJsonSchemasOpen: false,
        sendError: null,
        ...toWireFormatPatch(isProtobuf ? entry.wireFormat : undefined),
        ...schemaPatch,
      },
    })

    if (warnProtoMissing) {
      toast.warning(t('dispatch.execution.protobufHistoryMissingSchema'))
    }

    if (!connectorExists) {
      toast.warning(t('dispatch.execution.connectorMissing', { producer: entry.producerName }))
      return
    }

    toast.success(t('dispatch.execution.loadedHistoryEntry', { historyId: entry.id }))
  }

  const loadSingleRequestToDispatch = (entry: SingleRequestPayload) => {
    const isProtobuf = entry.contentType === 'application/x-protobuf'
    const connectorExists = stateRef.current.connectors.some(
      (connector) => connector.name === entry.producerName,
    )

    if (connectorExists) {
      setActiveConnector(entry.producerName)
    }

    const schemaPatch = isProtobuf
      ? toProtobufSchemaHydrationPatch({
          schemaId: null,
          protoSchema: entry.protoSchema ?? null,
          findRepoProtoSchema,
        })
      : toJsonSchemaHydrationPatch({
          schemaId: null,
          useRepoSchema: false,
        })

    dispatch({
      type: 'draftHydratedFromSavedRequest',
      patch: {
        selectedConnectorName: entry.producerName,
        contentMode: isProtobuf ? 'protobuf' : 'json',
        topicRaw: entry.topic ?? '',
        routingKeyRaw: entry.routingKey ?? '',
        exchangeRaw: entry.exchange ?? '',
        kafkaKeyRaw: '',
        kafkaKeyKind: 'literal',
        kafkaHeadersRows: toHeaderRows(entry.headers),
        stepStateRaw: JSON.stringify(entry.state, null, 2),
        loadedHistoryMetadata: {
          executions: resolveExecutionCount(entry.executions),
          stage: trimOr(entry.stage, DEFAULT_STAGE),
          event: trimOr(entry.event, DEFAULT_EVENT),
          headers: entry.headers ?? {},
          workflowState: entry.workflowState,
        },
        loadedFromHistoryId: null,
        payloadEditorMode: 'raw',
        studioOverridesByField: {},
        studioSelectedField: '',
        studioScopePath: '',
        isProtoSchemasOpen: false,
        isJsonSchemasOpen: false,
        sendError: null,
        ...toWireFormatPatch(
          isProtobuf && entry.wireFormat.type !== 'none' ? entry.wireFormat : undefined,
        ),
        ...schemaPatch,
      },
    })

    if (!connectorExists) {
      toast.warning(t('dispatch.execution.connectorMissing', { producer: entry.producerName }))
      return
    }

    toast.success(t('dispatch.execution.loadedSingleRequest', { requestName: entry.singleRequestName }))
  }

  return {
    loadHistoryEntryToDispatch,
    loadSingleRequestToDispatch,
  }
}
