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
import { CodeEditor } from '../../../../../shared/components/CodeEditor'
import type {
  DispatchRequestCardLabels,
  DispatchSchemaOptionViewModel,
} from '../../../types/messageDispatch.view.types'
import type { ContentMode } from '../../../types/messageDispatch.types'

interface DispatchSchemaSectionProps {
  labels: DispatchRequestCardLabels
  contentMode: ContentMode
  isSending: boolean
  availableSchemaOptions: DispatchSchemaOptionViewModel[]
  isProtoSchemasOpen: boolean
  isProtoSchemaCollapsed: boolean
  customProtoSchemaRaw: string
  isProtoBaseApplied: boolean
  hasPendingProtoBaseChanges: boolean
  onApplyProtoSchemaBase: () => void
  onToggleProtoSchemas: () => void
  onImportProtoSchema: (schemaId: string) => void
  onToggleProtoSchemaCollapse: () => void
  onCustomProtoSchemaChange: (value: string) => void
}

export const DispatchSchemaSection = React.memo(function DispatchSchemaSection({
  labels,
  contentMode,
  isSending,
  availableSchemaOptions,
  isProtoSchemasOpen,
  isProtoSchemaCollapsed,
  customProtoSchemaRaw,
  isProtoBaseApplied,
  hasPendingProtoBaseChanges,
  onApplyProtoSchemaBase,
  onToggleProtoSchemas,
  onImportProtoSchema,
  onToggleProtoSchemaCollapse,
  onCustomProtoSchemaChange,
}: DispatchSchemaSectionProps) {
  if (contentMode !== 'protobuf') return null

  return (
    <div className="dispatch-custom-schema">
      <div className="dispatch-editor-block">
        <div className="dispatch-proto-source-row">
          <strong className="dispatch-proto-title">{labels.protoSchemaTitle}</strong>
          <button
            type="button"
            className="runs-cta runs-cta-secondary"
            onClick={onApplyProtoSchemaBase}
            disabled={isSending || (isProtoBaseApplied && !hasPendingProtoBaseChanges)}
          >
            {isProtoBaseApplied && !hasPendingProtoBaseChanges
              ? labels.protoApplied
              : labels.applyProtoAsBase}
          </button>
          <div className="dispatch-schemas-menu-wrap">
            <button
              type="button"
              className={`runs-cta runs-cta-secondary ${isProtoSchemasOpen ? 'is-active' : ''}`}
              aria-expanded={isProtoSchemasOpen}
              onClick={onToggleProtoSchemas}
              disabled={isSending}
            >
              {labels.schemas}
            </button>
            {isProtoSchemasOpen ? (
              <div
                className="dispatch-schemas-menu"
                role="listbox"
                aria-label={labels.schemas}
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
                      onClick={() => { if (!isSending) onImportProtoSchema(schema.id) }}
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
                  <p className="dispatch-schemas-empty">{labels.noProtoSchemas}</p>
                )}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="runs-cta runs-cta-secondary"
            onClick={onToggleProtoSchemaCollapse}
            disabled={isSending}
            aria-label={
              isProtoSchemaCollapsed ? labels.expandProtoSchema : labels.collapseProtoSchema
            }
            title={isProtoSchemaCollapsed ? labels.expand : labels.collapse}
          >
            {isProtoSchemaCollapsed ? '▾' : '▴'}
          </button>
        </div>
        {isProtoSchemaCollapsed ? null : (
          <CodeEditor
            className="dispatch-code-editor"
            language="proto"
            ariaLabel="Protobuf schema editor"
            value={customProtoSchemaRaw}
            onChange={onCustomProtoSchemaChange}
            height="260px"
          />
        )}
      </div>
    </div>
  )
})
