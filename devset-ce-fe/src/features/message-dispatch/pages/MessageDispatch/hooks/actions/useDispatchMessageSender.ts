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
import { trimOr } from '../../../../../../shared/utils/string-normalization'
import { extractSchemaRootFields } from '../../../../../flow-builder/utils/schema-extraction.utils'
import type { LoadedSchema } from '../../../../../flow-builder/types'
import type { ConnectorStatus } from '../../../../../../shared/services/kafka-connectors.service'
import {
  DEFAULT_EVENT,
  DEFAULT_STAGE,
} from '../../../../message-dispatch.constants'
import {
  executeSingleStep,
  waitForDispatchCompletion,
  type SingleStepExecuteRequest,
} from '../../../../services/message-dispatch.service'
import { serializeKeyValue } from '../../../../../../shared/types/key-value.types'
import type { MessageDispatchAction, MessageDispatchState } from '../../state/MessageDispatch.types'
import {
  isRecord,
  parseStepState,
  resolveCollectionContext,
  resolveDispatchWireFormat,
  resolveExecutionCount,
  toHeadersRecord,
} from '../utils/dispatchExecution.utils'

type UseDispatchMessageSenderParams = {
  dispatch: Dispatch<MessageDispatchAction>
  stateRef: RefObject<MessageDispatchState>
  derived: {
    selectedConnector: ConnectorStatus | null
    selectedRepoSchema: LoadedSchema | null
    activeSchemaForPayload: LoadedSchema | null
  }
  refreshHistory: (showSpinner?: boolean) => Promise<void>
}

type ResolvedDispatchDraft = {
  selectedConnector: NonNullable<ConnectorStatus>
  stageSchema: LoadedSchema | null
  stepState: Record<string, unknown>
  executions: number
  normalizedTopic: string
  normalizedRoutingKey: string
  normalizedExchange: string
  normalizedStage: string
  normalizedEvent: string
  normalizedWorkflowId: string
  normalizedHeaders: Record<string, unknown>
  normalizedKafkaHeaders: Record<string, string>
  normalizedKafkaKey: string | Record<string, string> | null
  normalizedWorkflowState: Record<string, unknown> | undefined
  normalizedProtobufRootMessage: string
  resolvedWireFormat: SingleStepExecuteRequest['wireFormat']
}

export function useDispatchMessageSender({
  dispatch: dispatchAction,
  stateRef,
  derived,
  refreshHistory,
}: UseDispatchMessageSenderParams) {
  const { t } = useI18n()

  const resolveDispatchDraft = (): ResolvedDispatchDraft => {
    const state = stateRef.current
    const { selectedConnector, selectedRepoSchema, activeSchemaForPayload } = derived

    if (!selectedConnector) {
      throw new Error(t('dispatch.execution.selectConnectorFirst'))
    }
    if (!selectedConnector.producerConnected) {
      throw new Error(t('dispatch.execution.connectorProducerDisconnected'))
    }
    if (state.contentMode === 'protobuf' && !state.isProtoBaseApplied) {
      throw new Error(t('dispatch.execution.protobufApplyBaseFirst'))
    }
    if (state.contentMode === 'protobuf' && state.isProtoResyncRequired) {
      throw new Error(t('dispatch.execution.protobufResyncRequired'))
    }

    const stepState = parseStepState(state.stepStateRaw, t)
    const stageSchema =
      state.contentMode === 'protobuf'
        ? activeSchemaForPayload
        : state.schemaSource === 'repo'
          ? selectedRepoSchema
          : null

    if (selectedConnector.type === 'rabbit') {
      const hasRoutingTarget =
        state.topicRaw.trim() || state.routingKeyRaw.trim() || state.exchangeRaw.trim()
      if (!hasRoutingTarget) {
        throw new Error(t('dispatch.execution.rabbitRoutingTargetRequired'))
      }
    }

    if (selectedConnector.type === 'kafka' && !state.topicRaw.trim()) {
      throw new Error(t('dispatch.execution.kafkaTopicRequired'))
    }

    if (state.contentMode === 'json' && state.schemaSource === 'repo' && !selectedRepoSchema) {
      throw new Error(t('dispatch.execution.selectSchemaFromRepo'))
    }

    if (state.contentMode === 'protobuf') {
      if (!stageSchema) {
        throw new Error(t('dispatch.execution.protobufSchemaRequired'))
      }
      if (stageSchema.schemaType !== 'protobuf') {
        throw new Error(t('dispatch.execution.schemaNotProtobuf', { schemaId: stageSchema.id }))
      }
      if (typeof stageSchema.schema !== 'string' || !stageSchema.schema.trim()) {
        throw new Error(t('dispatch.execution.schemaMissingProto', { schemaId: stageSchema.id }))
      }

      const allowedFields = new Set(extractSchemaRootFields(stageSchema))
      if (allowedFields.size === 0) {
        throw new Error(t('dispatch.execution.schemaNoFields', { schemaId: stageSchema.id }))
      }

      const invalidFields = Object.keys(stepState).filter((field) => !allowedFields.has(field))
      if (invalidFields.length > 0) {
        throw new Error(
          t('dispatch.execution.stateFieldsOutsideSchema', {
            schemaId: stageSchema.id,
            fields: invalidFields.join(', '),
          }),
        )
      }
    }

    const loadedHistoryMetadata = state.loadedHistoryMetadata
    return {
      selectedConnector,
      stageSchema,
      stepState,
      executions: resolveExecutionCount(loadedHistoryMetadata?.executions),
      normalizedTopic: state.topicRaw.trim(),
      normalizedRoutingKey: state.routingKeyRaw.trim(),
      normalizedExchange: state.exchangeRaw.trim(),
      normalizedStage: trimOr(loadedHistoryMetadata?.stage, DEFAULT_STAGE),
      normalizedEvent: trimOr(loadedHistoryMetadata?.event, DEFAULT_EVENT),
      normalizedWorkflowId: loadedHistoryMetadata?.workflowId?.trim() ?? '',
      normalizedHeaders: loadedHistoryMetadata?.headers ?? {},
      normalizedKafkaHeaders: toHeadersRecord(state.kafkaHeadersRows),
      normalizedKafkaKey: serializeKeyValue({ kind: state.kafkaKeyKind, value: state.kafkaKeyRaw }),
      normalizedWorkflowState: isRecord(loadedHistoryMetadata?.workflowState)
        ? loadedHistoryMetadata.workflowState
        : undefined,
      normalizedProtobufRootMessage: loadedHistoryMetadata?.protobufRootMessage?.trim() ?? '',
      resolvedWireFormat: resolveDispatchWireFormat({
        isProtobuf: state.contentMode === 'protobuf',
        wireFormatEnabled: state.wireFormatEnabled,
        wireFormatPrefixValue: state.wireFormatPrefixValue,
        onInvalidPrefix: () => dispatchAction({ type: 'wireFormatPrefixValueChanged', value: state.wireFormatPrefixValue }),
        t,
      }),
    }
  }

  const sendSingleMessage = async () => {
    dispatchAction({ type: 'sendErrorCleared' })

    try {
      const draft = resolveDispatchDraft()
      const state = stateRef.current

      // Send the parent collection's context as request.state — it seeds
      // `state.*` paths in the BE engine so `$ref`s inside `set` can resolve.
      // The user's Raw DSL JSON is the event payload → goes to `set`
      // (compiled to `currentEvent.*`, the actual outgoing body).
      const activeCollectionName =
        state.loadedSingleRequestCollectionName || state.selectedCollectionName
      const { context: collectionContext, missing: collectionContextMissing } =
        resolveCollectionContext(state.collections, activeCollectionName)
      if (collectionContextMissing) {
        const warning = t('dispatch.execution.collectionContextMissing', {
          collectionName: activeCollectionName,
        })
        toast.warning(warning)
      }

      const request: SingleStepExecuteRequest = {
        workflowId: draft.normalizedWorkflowId || undefined,
        messageType: draft.selectedConnector.type,
        contentType: state.contentMode === 'protobuf' ? 'application/x-protobuf' : 'application/json',
        producerName: draft.selectedConnector.name,
        topic: draft.normalizedTopic || undefined,
        key: draft.selectedConnector.type === 'kafka' ? draft.normalizedKafkaKey ?? undefined : undefined,
        routingKey: draft.normalizedRoutingKey || undefined,
        exchange: draft.normalizedExchange || undefined,
        executions: draft.executions,
        stage: draft.normalizedStage,
        event: draft.normalizedEvent,
        state: collectionContext,
        set: draft.stepState,
        headers:
          draft.selectedConnector.type === 'kafka'
            ? Object.keys(draft.normalizedKafkaHeaders).length > 0
              ? draft.normalizedKafkaHeaders
              : {}
            : draft.normalizedHeaders,
        workflowState: draft.normalizedWorkflowState,
        schemaId: state.contentMode === 'json' ? draft.stageSchema?.id : derived.selectedRepoSchema?.id,
        protoSchema: state.contentMode === 'protobuf' ? (draft.stageSchema?.schema as string) : undefined, // SAFETY: schema field is string when contentMode is 'protobuf' (conditional ensures this path)
        protobufRootMessage: draft.normalizedProtobufRootMessage || undefined,
        wireFormat: draft.resolvedWireFormat,
      }

      dispatchAction({ type: 'sendStarted' })
      const executeResponse = await executeSingleStep(request)
      const finalStatus = await waitForDispatchCompletion(executeResponse.runId)
      toast.info(t('dispatch.execution.idsInfo', { historyId: executeResponse.historyId, runId: executeResponse.runId }))

      if (finalStatus?.status === 'FAILED') {
        throw new Error(finalStatus.errorMessage || t('dispatch.execution.dispatchFinishedError'))
      }
      if (finalStatus?.status === 'STOPPED') {
        toast.warning(t('dispatch.execution.dispatchStopped'))
      } else if (finalStatus?.status === 'COMPLETED') {
        toast.success(t('dispatch.execution.messageSent'))
      } else {
        toast.info(t('dispatch.execution.dispatchAccepted'))
      }

      dispatchAction({ type: 'loadedHistoryCleared' })
      dispatchAction({ type: 'sendCompleted' })
      void refreshHistory(false)
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : t('dispatch.execution.sendFailed')
      dispatchAction({ type: 'sendFailed', error: message })
      toast.error(message)
    }
  }

  return {
    sendSingleMessage,
  }
}
