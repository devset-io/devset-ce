/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useMemo } from 'react'
import { useI18n } from '../../../../../core/i18n/I18nProvider'
import { CodeEditor } from '../../../../../shared/components/CodeEditor'
import { FunctionBuilder } from '../../../../../shared/components/FunctionBuilder'
import { SetFieldsSnapshotPanel } from '../../../../../shared/components/SetFieldsSnapshotPanel'
import type { FieldOverridePayload } from '../../../../flow-builder'
import { createDslCompleter } from '../../../../flow-builder/config/dsl-completer'
import type {
  DispatchRequestCardLabels,
  DispatchSchemaOptionViewModel,
  DispatchStudioComputedViewModel,
} from '../../../types/messageDispatch.view.types'
import type { ContentMode, PayloadEditorMode } from '../../../types/messageDispatch.types'

interface DispatchPayloadEditorProps {
  labels: DispatchRequestCardLabels
  contentMode: ContentMode
  isSending: boolean
  availableSchemaOptions: DispatchSchemaOptionViewModel[]
  isJsonSchemasOpen: boolean
  isProtoPayloadEnabled: boolean
  isProtoEditingBlocked: boolean
  payloadEditorMode: PayloadEditorMode
  stepStateRaw: string
  studioScopePath: string
  studioSelectedField: string
  studioComputed: DispatchStudioComputedViewModel
  functionBuilderKey: string
  onToggleJsonSchemas: () => void
  onImportJsonSchema: (schemaId: string) => void
  onPayloadEditorModeChange: (mode: PayloadEditorMode) => void
  onBeautifyStepState: () => void
  onStepStateChange: (value: string) => void
  onStudioSelectedFieldChange: (field: string) => void
  onStudioScopePathChange: (scopePath: string) => void
  onApplyFunctionStudioOverride: (field: string, payload: FieldOverridePayload) => void
  wireFormatSection: React.ReactNode
}

export const DispatchPayloadEditor = React.memo(function DispatchPayloadEditor({
  labels,
  contentMode,
  isSending,
  availableSchemaOptions,
  isJsonSchemasOpen,
  isProtoPayloadEnabled,
  isProtoEditingBlocked,
  payloadEditorMode,
  stepStateRaw,
  studioScopePath,
  studioSelectedField,
  studioComputed,
  functionBuilderKey,
  onToggleJsonSchemas,
  onImportJsonSchema,
  onPayloadEditorModeChange,
  onBeautifyStepState,
  onStepStateChange,
  onStudioSelectedFieldChange,
  onStudioScopePathChange,
  onApplyFunctionStudioOverride,
  wireFormatSection,
}: DispatchPayloadEditorProps) {
  const { locale } = useI18n()
  const completers = useMemo(() => [createDslCompleter(locale)], [locale])

  return (
    <div className="dispatch-editor-block">
      <div className="dispatch-editor-head">
        <strong>{labels.stepStateTitle}</strong>
        {contentMode === 'json' ? (
          <div className="dispatch-schemas-menu-wrap">
            <button
              type="button"
              className={`runs-cta runs-cta-secondary ${isJsonSchemasOpen ? 'is-active' : ''}`}
              aria-expanded={isJsonSchemasOpen}
              onClick={onToggleJsonSchemas}
              disabled={isSending}
            >
              {labels.importSchema}
            </button>
            {isJsonSchemasOpen ? (
              <div
                className="dispatch-schemas-menu"
                role="listbox"
                aria-label={labels.importSchema}
              >
                {availableSchemaOptions.length > 0 ? (
                  availableSchemaOptions.map((schema, index) => (
                    <div
                      key={schema.id}
                      className="dispatch-schemas-item"
                      role="option"
                      tabIndex={0}
                      autoFocus={index === 0}
                      aria-selected={false}
                      aria-disabled={isSending}
                      onClick={() => { if (!isSending) onImportJsonSchema(schema.id) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click() }}
                    >
                      <div className="dispatch-schemas-item-info">
                        <strong>{schema.id}</strong>
                        <span>v{schema.version}</span>
                      </div>
                      <div className="dispatch-schemas-item-actions">
                        <span className={`runs-cta runs-cta-secondary${isSending ? ' is-disabled' : ''}`}>
                          {labels.import}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="dispatch-schemas-empty">{labels.noJsonSchemas}</p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {contentMode === 'protobuf' && !isProtoPayloadEnabled ? (
        <div className="dispatch-locked-message">
          <strong>{labels.lockedTitle}</strong>
          <p>{labels.lockedHint}</p>
        </div>
      ) : null}
      {contentMode !== 'protobuf' || isProtoPayloadEnabled ? (
        <>
          {contentMode === 'protobuf' ? (
            <p className="dispatch-protobuf-note">{labels.protobufNote}</p>
          ) : null}
          <div className="dispatch-editor-mode-toggle">
            <button
              type="button"
              className={`dispatch-toggle-btn ${payloadEditorMode === 'raw' ? 'is-active' : ''}`}
              onClick={() => onPayloadEditorModeChange('raw')}
              disabled={isSending || !isProtoPayloadEnabled}
            >
              {labels.rawDsl}
            </button>
            <button
              type="button"
              className={`dispatch-toggle-btn ${payloadEditorMode === 'function-studio' ? 'is-active' : ''}`}
              onClick={() => onPayloadEditorModeChange('function-studio')}
              disabled={isSending || !isProtoPayloadEnabled || isProtoEditingBlocked}
            >
              {labels.functionStudio}
            </button>
          </div>

          {payloadEditorMode === 'raw' ? (
            <section className="function-studio-panel dispatch-payload-raw">
              <div className="dispatch-raw-toolbar">
                <p className="dispatch-raw-toolbar-note">
                  {contentMode === 'protobuf'
                    ? labels.rawDslProtoHint
                    : labels.rawDslJsonHint}
                </p>
                <button
                  type="button"
                  className="dispatch-beautify-btn"
                  onClick={onBeautifyStepState}
                  disabled={isSending || !isProtoPayloadEnabled}
                >
                  {labels.formatJson}
                </button>
              </div>
              <CodeEditor
                className="dispatch-code-editor"
                language="json"
                ariaLabel="JSON payload editor"
                value={stepStateRaw}
                onChange={onStepStateChange}
                height="520px"
                readOnly={!isProtoPayloadEnabled}
                completers={completers}
              />
            </section>
          ) : (
            <div className="function-studio-body dispatch-payload-grid">
              <section className="function-studio-panel dispatch-payload-left">
                <SetFieldsSnapshotPanel
                  scopePath={studioScopePath}
                  scopeTrail={studioComputed.scopeTrail}
                  visibleEntries={studioComputed.snapshotEntries}
                  inheritedFields={[]}
                  setRootFields={studioComputed.draftSetRootFields}
                  hideSourceMode
                  hideTitle
                  sourceMode="none"
                  onSourceModeChange={() => {}}
                  selectedField={studioSelectedField || null}
                  onSelectField={onStudioSelectedFieldChange}
                  onScopeChange={onStudioScopePathChange}
                />
              </section>
              <section className="function-studio-panel dispatch-payload-right">
                <div className="dispatch-function-studio">
                  <p className="dispatch-studio-note">{labels.functionStudioNote}</p>
                  {wireFormatSection}
                  <FunctionBuilder
                    key={functionBuilderKey}
                    availableFields={studioComputed.functionFields}
                    onApply={onApplyFunctionStudioOverride}
                    disabled={isSending || !isProtoPayloadEnabled || isProtoEditingBlocked}
                    selectedField={
                      studioSelectedField || studioComputed.functionFields[0]
                    }
                    selectedFieldLiteralKindHint={
                      studioComputed.selectedFieldLiteralKindHint
                    }
                    selectedFieldMode={studioComputed.draftSelectedFieldMode}
                    selectedFieldExpression={
                      studioComputed.draftSelectedFieldExpression
                    }
                    selectedFieldValue={studioComputed.draftSelectedFieldValue}
                    selectedFieldRawValue={studioComputed.draftSelectedFieldRawValue}
                  />
                </div>
              </section>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
})
