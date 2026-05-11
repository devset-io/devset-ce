/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { RefObject } from 'react'
import { useI18n } from '../../../../../../core/i18n/I18nProvider'
import { requireTrimmed } from '../../../../../../shared/utils/string-guards'
import { trimOr, trimToNull } from '../../../../../../shared/utils/string-normalization'
import type { LoadedSchema } from '../../../../../flow-builder/types'
import type { ConnectorStatus } from '../../../../../../shared/services/kafka-connectors.service'
import type { SingleRequestPayload } from '../../../../services/message-dispatch.service'
import type { MessageDispatchState } from '../../state/MessageDispatch.types'
import {
  isRecord,
  parseStepStateLenient,
  resolveExecutionCount,
  resolveSavedRequestWireFormat,
  toHeadersRecord,
} from '../utils/dispatchExecution.utils'

type UseDispatchSingleRequestDraftParams = {
  stateRef: RefObject<MessageDispatchState>
  derived: {
    selectedConnector: ConnectorStatus | null
    activeSchemaForPayload: LoadedSchema | null
  }
}

export function useDispatchSingleRequestDraft({
  stateRef,
  derived,
}: UseDispatchSingleRequestDraftParams) {
  const { t } = useI18n()

  const buildSingleRequestPayload = (
    singleRequestName: string,
    collectionName: string,
  ): SingleRequestPayload => {
    const normalizedSingleRequestName = requireTrimmed(singleRequestName, t('dispatch.execution.provideSingleRequestName'))
    const normalizedCollectionName = requireTrimmed(collectionName, t('dispatch.execution.selectCollectionFirst'))

    const state = stateRef.current
    const { selectedConnector, activeSchemaForPayload } = derived
    const normalizedKafkaHeaders = toHeadersRecord(state.kafkaHeadersRows)
    const producerName = trimOr(selectedConnector?.name ?? state.selectedConnectorName, 'local')
    const messageType = selectedConnector?.type ?? 'kafka'
    const protoSchema =
      state.contentMode === 'protobuf'
        ? typeof activeSchemaForPayload?.schema === 'string'
          ? activeSchemaForPayload.schema
          : trimToNull(state.customProtoSchemaRaw)
        : null

    return {
      singleRequestName: normalizedSingleRequestName,
      collectionName: normalizedCollectionName,
      messageType,
      contentType: state.contentMode === 'protobuf' ? 'application/x-protobuf' : 'application/json',
      producerName,
      topic: trimToNull(state.topicRaw),
      exchange: trimToNull(state.exchangeRaw),
      routingKey: trimToNull(state.routingKeyRaw),
      executions: resolveExecutionCount(state.loadedHistoryMetadata?.executions),
      stage: trimToNull(state.loadedHistoryMetadata?.stage),
      event: trimToNull(state.loadedHistoryMetadata?.event),
      state: parseStepStateLenient(state.stepStateRaw),
      headers:
        messageType === 'kafka'
          ? Object.keys(normalizedKafkaHeaders).length > 0
            ? normalizedKafkaHeaders
            : {}
          : isRecord(state.loadedHistoryMetadata?.headers)
            ? state.loadedHistoryMetadata.headers
            : {},
      wireFormat: resolveSavedRequestWireFormat({
        isProtobuf: state.contentMode === 'protobuf',
        wireFormatEnabled: state.wireFormatEnabled,
        wireFormatPrefixValue: state.wireFormatPrefixValue,
      }),
      workflowState: isRecord(state.loadedHistoryMetadata?.workflowState)
        ? state.loadedHistoryMetadata.workflowState
        : {},
      protoSchema,
    }
  }

  return {
    buildSingleRequestPayload,
  }
}
