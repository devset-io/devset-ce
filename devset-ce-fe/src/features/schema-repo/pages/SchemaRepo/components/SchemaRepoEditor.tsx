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
import { ProtobufBuilderPanel } from './ProtobufBuilderPanel'
import { SchemaRepoJsonEditor } from './SchemaRepoJsonEditor'
import type { SchemaRepoEditorProps } from '../../../types/schemaRepo.view.types'

export const SchemaRepoEditor = React.memo(function SchemaRepoEditor({
  labels,
  editor,
  schemaIdDraft,
  schemaJsonDraft,
  schemaProtoDraft,
  onStartEdit,
  onCancelEdit,
  onSave,
  onSchemaIdDraftChange,
  onSchemaJsonDraftChange,
  onSchemaProtoDraftChange,
  onEditorSurfaceChange,
}: SchemaRepoEditorProps) {
  return (
    <section className="schema-viewer">
      <div className="schema-viewer-head">
        <h3>{editor.title}</h3>
        <div className="schema-actions">
          {editor.canSwitchSurface ? (
            <div
              className="schema-editor-tabs"
              role="tablist"
              aria-label={labels.editorModeAria}
            >
              <button
                type="button"
                role="tab"
                id="schema-tab-json"
                aria-selected={editor.surface === 'json'}
                aria-controls="schema-panel-json"
                tabIndex={editor.surface === 'json' ? 0 : -1}
                className={editor.surface === 'json' ? 'active' : ''}
                onClick={() => onEditorSurfaceChange('json')}
              >
                JSON
              </button>
              <button
                type="button"
                role="tab"
                id="schema-tab-protobuf"
                aria-selected={editor.surface === 'protobuf'}
                aria-controls="schema-panel-protobuf"
                tabIndex={editor.surface === 'protobuf' ? 0 : -1}
                className={editor.surface === 'protobuf' ? 'active' : ''}
                onClick={() => onEditorSurfaceChange('protobuf')}
              >
                {labels.protobufBuilder}
              </button>
            </div>
          ) : (
            <span className="schema-editor-mode-pill">{editor.surfaceLabel}</span>
          )}
          {editor.mode === 'view' ? (
            <button type="button" className="runs-cta runs-cta-primary" onClick={onStartEdit} disabled={!editor.canEdit}>
              {labels.edit}
            </button>
          ) : (
            <>
              <button type="button" className="runs-cta runs-cta-secondary" onClick={onCancelEdit} disabled={editor.isSaving}>
                {labels.cancel}
              </button>
              <button type="button" className="runs-cta runs-cta-primary" onClick={onSave} disabled={editor.isSaving}>
                {editor.isSaving ? labels.saving : labels.save}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="schema-meta-grid">
        <label className="schema-meta-field">
          <span>{labels.schemaId}</span>
          <input
            value={schemaIdDraft}
            onChange={(event) => onSchemaIdDraftChange(event.target.value)}
            readOnly={editor.mode !== 'create'}
            placeholder={labels.schemaIdExample}
          />
        </label>
        <label className="schema-meta-field">
          <span>{labels.apiType}</span>
          <input value={editor.schemaTypeValue} readOnly />
        </label>
      </div>

      <div className="schema-editor-area">
        {editor.surface === 'json' ? (
          <div role="tabpanel" id="schema-panel-json" aria-labelledby="schema-tab-json">
            <SchemaRepoJsonEditor
              value={schemaJsonDraft}
              onChange={onSchemaJsonDraftChange}
              readOnly={editor.isReadOnly}
            />
          </div>
        ) : (
          <div role="tabpanel" id="schema-panel-protobuf" aria-labelledby="schema-tab-protobuf">
            <ProtobufBuilderPanel
              value={schemaProtoDraft}
              onChange={onSchemaProtoDraftChange}
              editorTitle={labels.protoEditorTitle}
              validationBadgeLabel={labels.protoEditorValidation}
              readOnly={editor.isReadOnly}
            />
          </div>
        )}
      </div>
    </section>
  )
})
