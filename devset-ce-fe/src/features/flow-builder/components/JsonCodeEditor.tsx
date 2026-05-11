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
import { useI18n } from '../../../core/i18n/I18nProvider'
import { CodeEditor } from '../../../shared/components/CodeEditor'
import { createDslCompleter } from '../config/dsl-completer'

type JsonCodeEditorProps = {
  value: string
  onChange: (next: string) => void
  height?: string
  readOnly?: boolean
}

export const JsonCodeEditor = React.memo(function JsonCodeEditor({ value, onChange, height = '320px', readOnly = false }: JsonCodeEditorProps) {
  const { locale } = useI18n()
  const completers = useMemo(() => [createDslCompleter(locale)], [locale])

  return (
    <CodeEditor
      ariaLabel="JSON editor"
      language="json"
      value={value}
      onChange={onChange}
      height={height}
      readOnly={readOnly}
      completers={completers}
    />
  )
})
