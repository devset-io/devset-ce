/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React from 'react'
import { DispatchRequestHead } from './DispatchRequestHead'
import { DispatchSaveModal } from './DispatchSaveModal'
import { DispatchConnectorConfig } from './DispatchConnectorConfig'
import { DispatchSchemaSection } from './DispatchSchemaSection'
import { DispatchPayloadEditor } from './DispatchPayloadEditor'
import { DispatchWireFormatConfig } from './DispatchWireFormatConfig'
import type { DispatchRequestCardProps } from '../../../types/messageDispatch.view.types'

export const DispatchRequestCard = React.memo(function DispatchRequestCard(props: DispatchRequestCardProps) {
  return (
    <section className="dispatch-request-card">
      <DispatchRequestHead
        labels={props.labels}
        isHistoryPanelOpen={props.isHistoryPanelOpen}
        loadedFromHistoryId={props.loadedFromHistoryId}
        selectedSingleRequestName={props.selectedSingleRequestName}
        loadedSingleRequestCollectionName={props.loadedSingleRequestCollectionName}
        isSending={props.isSending}
        isSavingSingleRequest={props.isSavingSingleRequest}
        canSend={props.canSend}
        saveActionKind={props.saveActionKind}
        onToggleHistory={props.onToggleHistory}
        onSend={props.onSend}
        onSaveAction={props.onSaveAction}
      />

      <DispatchSaveModal
        labels={props.labels}
        saveModal={props.saveModal}
        isSavingSingleRequest={props.isSavingSingleRequest}
        onSaveModalClose={props.onSaveModalClose}
        onSaveModalSubmit={props.onSaveModalSubmit}
        onSaveCollectionNameChange={props.onSaveCollectionNameChange}
        onSaveRequestNameChange={props.onSaveRequestNameChange}
      />

      {props.configError ? <p className="dispatch-error">{props.configError}</p> : null}

      <DispatchConnectorConfig
        labels={props.labels}
        connectorOptions={props.connectorOptions}
        selectedConnectorName={props.selectedConnectorName}
        contentMode={props.contentMode}
        isLoadingConfig={props.isLoadingConfig}
        isSending={props.isSending}
        topicRaw={props.topicRaw}
        topicSuggestions={props.topicSuggestions}
        routingKeyRaw={props.routingKeyRaw}
        exchangeRaw={props.exchangeRaw}
        exchangeSuggestions={props.exchangeSuggestions}
        kafkaEnvelopeCard={props.kafkaEnvelopeCard}
        onConnectorChange={props.onConnectorChange}
        onContentModeChange={props.onContentModeChange}
        onTopicChange={props.onTopicChange}
        onRoutingKeyChange={props.onRoutingKeyChange}
        onExchangeChange={props.onExchangeChange}
      />

      <DispatchSchemaSection
        labels={props.labels}
        contentMode={props.contentMode}
        isSending={props.isSending}
        availableSchemaOptions={props.availableSchemaOptions}
        isProtoSchemasOpen={props.isProtoSchemasOpen}
        isProtoSchemaCollapsed={props.isProtoSchemaCollapsed}
        customProtoSchemaRaw={props.customProtoSchemaRaw}
        isProtoBaseApplied={props.isProtoBaseApplied}
        hasPendingProtoBaseChanges={props.hasPendingProtoBaseChanges}
        onApplyProtoSchemaBase={props.onApplyProtoSchemaBase}
        onToggleProtoSchemas={props.onToggleProtoSchemas}
        onImportProtoSchema={props.onImportProtoSchema}
        onToggleProtoSchemaCollapse={props.onToggleProtoSchemaCollapse}
        onCustomProtoSchemaChange={props.onCustomProtoSchemaChange}
      />

      <DispatchPayloadEditor
        labels={props.labels}
        contentMode={props.contentMode}
        isSending={props.isSending}
        availableSchemaOptions={props.availableSchemaOptions}
        isJsonSchemasOpen={props.isJsonSchemasOpen}
        isProtoPayloadEnabled={props.isProtoPayloadEnabled}
        isProtoEditingBlocked={props.isProtoEditingBlocked}
        payloadEditorMode={props.payloadEditorMode}
        stepStateRaw={props.stepStateRaw}
        contextFieldNames={props.contextFieldNames}
        studioScopePath={props.studioScopePath}
        studioSelectedField={props.studioSelectedField}
        studioComputed={props.studioComputed}
        functionBuilderKey={props.functionBuilderKey}
        onToggleJsonSchemas={props.onToggleJsonSchemas}
        onImportJsonSchema={props.onImportJsonSchema}
        onPayloadEditorModeChange={props.onPayloadEditorModeChange}
        onBeautifyStepState={props.onBeautifyStepState}
        onStepStateChange={props.onStepStateChange}
        onStudioSelectedFieldChange={props.onStudioSelectedFieldChange}
        onStudioScopePathChange={props.onStudioScopePathChange}
        onApplyFunctionStudioOverride={props.onApplyFunctionStudioOverride}
        wireFormatSection={
          <DispatchWireFormatConfig
            labels={props.labels}
            contentMode={props.contentMode}
            isSending={props.isSending}
            isProtoPayloadEnabled={props.isProtoPayloadEnabled}
            isProtoEditingBlocked={props.isProtoEditingBlocked}
            wireFormat={props.wireFormat}
            onWireFormatEnabledChange={props.onWireFormatEnabledChange}
            onWireFormatSourceChange={props.onWireFormatSourceChange}
            onWireFormatPrefixValueChange={props.onWireFormatPrefixValueChange}
          />
        }
      />

      {props.sendError ? <p className="dispatch-error">{props.sendError}</p> : null}
    </section>
  )
})
