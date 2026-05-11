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

type ProtobufBuilderPanelProps = {
  value: string
  onChange: (next: string) => void
  editorTitle: string
  validationBadgeLabel: string
  readOnly?: boolean
}

export const ProtobufBuilderPanel = React.memo(function ProtobufBuilderPanel({
  value,
  onChange,
  editorTitle,
  validationBadgeLabel,
  readOnly = false,
}: ProtobufBuilderPanelProps) {
  return (
    <div className="proto-builder-shell">
      <section className="proto-editor-pane">
        <div className="proto-pane-head">
          <strong>{editorTitle}</strong>
          <span className="proto-live-badge">{validationBadgeLabel}</span>
        </div>
        <CodeEditor
          className="proto-code-editor"
          language="proto"
          ariaLabel="Protobuf schema editor"
          value={value}
          height="100%"
          readOnly={readOnly}
          onChange={onChange}
        />
      </section>
    </div>
  )
})
