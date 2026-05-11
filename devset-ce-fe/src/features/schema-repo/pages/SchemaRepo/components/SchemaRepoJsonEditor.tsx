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

type SchemaRepoJsonEditorComponentProps = {
  value: string
  onChange: (next: string) => void
  readOnly?: boolean
}

export const SchemaRepoJsonEditor = React.memo(function SchemaRepoJsonEditor({
  value,
  onChange,
  readOnly = false,
}: SchemaRepoJsonEditorComponentProps) {
  return (
    <CodeEditor
      className="json-code-editor"
      language="json"
      ariaLabel="JSON schema editor"
      value={value}
      onChange={onChange}
      height="100%"
      readOnly={readOnly}
    />
  )
})
