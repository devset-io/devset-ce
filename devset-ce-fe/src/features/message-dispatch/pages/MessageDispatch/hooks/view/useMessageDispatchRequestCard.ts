/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useMemo } from 'react'
import type { MessageDispatchState } from '../../state/MessageDispatch.types'
import type { MessageDispatchCallbacks } from '../../../../types/dispatch.adapter.types'
import type { ConnectorStatus } from '../../../../../../shared/services/kafka-connectors.service'
import type { LoadedSchema } from '../../../../../flow-builder/types'
import type { useFunctionStudioComputed } from '../../../../../../shared/hooks/useFunctionStudioComputed'
import type {
  DispatchConnectorOptionViewModel,
  DispatchRequestCardLabels,
  DispatchRequestCardProps,
  DispatchSchemaOptionViewModel,
} from '../../../../types/messageDispatch.view.types'

type MessageDispatchRequestCardDerived = {
  selectedConnector: ConnectorStatus | null
  isProtoPayloadEnabled: boolean
  isProtoEditingBlocked: boolean
  hasPendingProtoBaseChanges: boolean
  availableSchemas: LoadedSchema[]
  isRabbitConnector: boolean
  isKafkaConnector: boolean
  studioComputed: ReturnType<typeof useFunctionStudioComputed>
  functionBuilderKey: string
}

type UseMessageDispatchRequestCardOptions = {
  labels: DispatchRequestCardLabels
  kafkaEnvelopeLabels: DispatchRequestCardProps['kafkaEnvelopeCard']['labels']
  state: MessageDispatchState
  derived: MessageDispatchRequestCardDerived
  callbacks: MessageDispatchCallbacks
}

export function useMessageDispatchRequestCard({
  labels,
  kafkaEnvelopeLabels,
  state,
  derived,
  callbacks,
}: UseMessageDispatchRequestCardOptions): DispatchRequestCardProps {
  const resolvedSingleRequestName = state.singleRequestNameRaw || state.selectedSingleRequestName || ''
  const isLoadedSingleRequest =
    !state.loadedFromHistoryId &&
    Boolean(state.selectedSingleRequestName) &&
    Boolean(state.loadedSingleRequestCollectionName)
  const shouldUpdateSingleRequest = callbacks.doesSingleRequestExist(
    state.selectedCollectionName,
    resolvedSingleRequestName,
  )
  const canSend =
    !state.isSending &&
    Boolean(derived.selectedConnector) &&
    derived.isProtoPayloadEnabled &&
    !derived.isProtoEditingBlocked &&
    !(state.contentMode === 'protobuf' && state.wireFormatEnabled && state.wireFormatPrefixValueError !== null)

  const connectorOptions = useMemo<DispatchConnectorOptionViewModel[]>(
    () =>
      state.connectors.map((connector) => ({
        name: connector.name,
        type: connector.type === 'rabbit' ? 'rabbit' : 'kafka',
      })),
    [state.connectors],
  )

  const availableSchemaOptions = useMemo<DispatchSchemaOptionViewModel[]>(
    () =>
      derived.availableSchemas.map((schema) => ({
        id: schema.id,
        version: schema.version,
      })),
    [derived.availableSchemas],
  )

  const handleSaveAction = async () => {
    if (shouldUpdateSingleRequest || isLoadedSingleRequest) {
      await callbacks.saveCurrentAsSingleRequest()
      return
    }

    callbacks.openSaveModal(
      state.loadedSingleRequestCollectionName ||
        state.selectedCollectionName ||
        state.collections[0]?.collectionName ||
        '',
      resolvedSingleRequestName,
    )
  }

  const handleSaveModalClose = () => {
    if (state.isSavingSingleRequest) {
      return
    }

    callbacks.closeSaveModal()
  }

  const handleSaveModalSubmit = async () => {
    const success = await callbacks.saveSingleRequestWithValues(
      state.saveCollectionName,
      state.saveRequestName,
    )
    if (success) {
      callbacks.closeSaveModal()
    }
  }

  return {
    labels,
    isHistoryPanelOpen: state.isHistoryPanelOpen,
    loadedFromHistoryId: state.loadedFromHistoryId,
    selectedSingleRequestName: state.selectedSingleRequestName,
    loadedSingleRequestCollectionName: state.loadedSingleRequestCollectionName,
    isSending: state.isSending,
    isSavingSingleRequest: state.isSavingSingleRequest,
    canSend,
    saveActionKind:
      shouldUpdateSingleRequest || isLoadedSingleRequest ? 'update' : 'save',
    configError: state.configError,
    sendError: state.sendError,
    saveModal: {
      isOpen: state.isSaveModalOpen,
      collectionName: state.saveCollectionName,
      requestName: state.saveRequestName,
      collectionOptions: state.collections.map((collection) => collection.collectionName),
    },
    connectorOptions,
    selectedConnectorName: state.selectedConnectorName,
    contentMode: state.contentMode,
    isLoadingConfig: state.isLoadingConfig,
    topicRaw: state.topicRaw,
    topicSuggestions: state.topicSuggestions.map((t) => ({ value: t, label: t })),
    routingKeyRaw: state.routingKeyRaw,
    exchangeRaw: state.exchangeRaw,
    exchangeSuggestions: state.exchangeSuggestions.map((e) => ({ value: e, label: e })),
    kafkaEnvelopeCard: {
      labels: kafkaEnvelopeLabels,
      isVisible: derived.isKafkaConnector,
      isSending: state.isSending,
      kafkaKeyRaw: state.kafkaKeyRaw,
      kafkaKeyKind: state.kafkaKeyKind,
      kafkaHeadersRows: state.kafkaHeadersRows,
      onKafkaKeyChange: callbacks.setKafkaKeyRaw,
      onKafkaKeyKindChange: callbacks.setKafkaKeyKind,
      onKafkaHeaderChange: callbacks.updateKafkaHeaderRow,
      onAddKafkaHeaderRow: callbacks.addKafkaHeaderRow,
      onRemoveKafkaHeaderRow: callbacks.removeKafkaHeaderRow,
    },
    availableSchemaOptions,
    isProtoSchemasOpen: state.isProtoSchemasOpen,
    isProtoSchemaCollapsed: state.isProtoSchemaCollapsed,
    customProtoSchemaRaw: state.customProtoSchemaRaw,
    isProtoBaseApplied: state.isProtoBaseApplied,
    hasPendingProtoBaseChanges: derived.hasPendingProtoBaseChanges,
    isJsonSchemasOpen: state.isJsonSchemasOpen,
    isProtoPayloadEnabled: derived.isProtoPayloadEnabled,
    isProtoEditingBlocked: derived.isProtoEditingBlocked,
    payloadEditorMode: state.payloadEditorMode,
    stepStateRaw: state.stepStateRaw,
    studioScopePath: state.studioScopePath,
    studioSelectedField: state.studioSelectedField,
    studioComputed: {
      scopeTrail: derived.studioComputed.scopeTrail,
      snapshotEntries: derived.studioComputed.snapshotEntries,
      draftSetRootFields: derived.studioComputed.draftSetRootFields,
      functionFields: derived.studioComputed.functionFields,
      selectedFieldLiteralKindHint: derived.studioComputed.selectedFieldLiteralKindHint,
      draftSelectedFieldMode: derived.studioComputed.draftSelectedFieldMode,
      draftSelectedFieldExpression: derived.studioComputed.draftSelectedFieldExpression,
      draftSelectedFieldValue: derived.studioComputed.draftSelectedFieldValue,
      draftSelectedFieldRawValue: derived.studioComputed.draftSelectedFieldRawValue,
    },
    functionBuilderKey: derived.functionBuilderKey,
    wireFormat: {
      enabled: state.wireFormatEnabled,
      prefixSource: state.wireFormatPrefixSource,
      prefixValue: state.wireFormatPrefixValue,
      prefixValueError: state.wireFormatPrefixValueError,
    },
    onToggleHistory: callbacks.toggleHistoryPanel,
    onSend: callbacks.sendSingleMessage,
    onSaveAction: handleSaveAction,
    onSaveModalClose: handleSaveModalClose,
    onSaveModalSubmit: handleSaveModalSubmit,
    onSaveCollectionNameChange: callbacks.setSaveCollectionName,
    onSaveRequestNameChange: callbacks.setSaveRequestName,
    onConnectorChange: callbacks.onConnectorChange,
    onContentModeChange: callbacks.onContentModeChange,
    onTopicChange: callbacks.setTopicRaw,
    onRoutingKeyChange: callbacks.setRoutingKeyRaw,
    onExchangeChange: callbacks.setExchangeRaw,
    onApplyProtoSchemaBase: callbacks.applyProtoSchemaBase,
    onToggleProtoSchemas: callbacks.toggleProtoSchemas,
    onImportProtoSchema: callbacks.applyProtoSchemaFromRepo,
    onToggleProtoSchemaCollapse: callbacks.toggleProtoSchemaCollapse,
    onCustomProtoSchemaChange: callbacks.onCustomProtoSchemaChange,
    onToggleJsonSchemas: callbacks.toggleJsonSchemas,
    onImportJsonSchema: callbacks.importJsonSchemaFromRepo,
    onPayloadEditorModeChange: callbacks.setPayloadEditorMode,
    onBeautifyStepState: callbacks.beautifyStepStateRaw,
    onStepStateChange: callbacks.handleStepStateRawChange,
    onStudioSelectedFieldChange: callbacks.setStudioSelectedField,
    onStudioScopePathChange: callbacks.setStudioScopePath,
    onApplyFunctionStudioOverride: callbacks.applyFunctionStudioOverride,
    onWireFormatEnabledChange: callbacks.handleWireFormatEnabledChange,
    onWireFormatSourceChange: () => {
      callbacks.handleWireFormatSourceChange('messagePrefix')
    },
    onWireFormatPrefixValueChange: callbacks.handleWireFormatPrefixValueChange,
  }
}
