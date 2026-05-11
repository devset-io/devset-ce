/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ace from 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/mode-protobuf'
import 'ace-builds/src-noconflict/theme-tomorrow'
import 'ace-builds/src-noconflict/theme-tomorrow_night'
import 'ace-builds/src-noconflict/ext-language_tools'
import 'ace-builds/src-noconflict/ext-searchbox'
import type { Ace } from 'ace-builds'

export type AceLanguage = 'json' | 'proto' | 'plaintext'

export type AceEditorProps = {
  value: string
  onChange: (next: string) => void
  language?: AceLanguage
  height?: string
  readOnly?: boolean
  ariaLabel?: string
  className?: string
  /** Optional Ace completers injected by the consumer. Rebuilt when the reference changes. */
  completers?: readonly object[]
}

const MODE_BY_LANGUAGE: Record<AceLanguage, string> = {
  json: 'ace/mode/json',
  proto: 'ace/mode/protobuf',
  plaintext: 'ace/mode/text',
}

/** Ace (AWS Cloud9) wrapper. Mounted lazily — keep behind the public CodeEditor entrypoint. */
export function AceEditor({
  value,
  onChange,
  language = 'plaintext',
  height = '320px',
  readOnly = false,
  ariaLabel,
  className = '',
  completers,
}: AceEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Ace.Editor | null>(null)
  const onChangeRef = useRef(onChange)
  const ignoreNextChangeRef = useRef(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(readCurrentTheme())

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useLayoutEffect(() => {
    if (!containerRef.current) return

    const editor = ace.edit(containerRef.current, {
      mode: MODE_BY_LANGUAGE[language],
      theme: theme === 'dark' ? 'ace/theme/tomorrow_night' : 'ace/theme/tomorrow',
      value,
      readOnly,
      useWorker: false,
      tabSize: 2,
      useSoftTabs: true,
      showPrintMargin: false,
      highlightActiveLine: true,
      highlightSelectedWord: true,
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true,
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'SF Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Roboto Mono', monospace",
      fontSize: '13px',
    })

    editorRef.current = editor

    if (ariaLabel) editor.container.setAttribute('aria-label', ariaLabel)
    editor.container.style.lineHeight = '1.55'

    editor.session.on('change', () => {
      if (ignoreNextChangeRef.current) {
        ignoreNextChangeRef.current = false
        return
      }
      onChangeRef.current(editor.getValue())
    })

    const themeObserver = new MutationObserver(() => setTheme(readCurrentTheme()))
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      themeObserver.disconnect()
      editor.destroy()
      editorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (editor.getValue() !== value) {
      ignoreNextChangeRef.current = true
      const cursor = editor.getCursorPosition()
      editor.setValue(value, -1)
      editor.moveCursorToPosition(cursor)
    }
  }, [value])

  useEffect(() => {
    editorRef.current?.session.setMode(MODE_BY_LANGUAGE[language])
  }, [language])

  useEffect(() => {
    editorRef.current?.setReadOnly(readOnly)
  }, [readOnly])

  useEffect(() => {
    editorRef.current?.setTheme(theme === 'dark' ? 'ace/theme/tomorrow_night' : 'ace/theme/tomorrow')
  }, [theme])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !completers?.length) return
    // SAFETY: editor.completers is Ace's per-instance completer array; not exposed in upstream types
    const ed = editor as unknown as { completers?: object[] }
    const prev = ed.completers ?? []
    ed.completers = [...prev, ...completers]
    return () => {
      if (!editorRef.current) return
      const current = (editorRef.current as unknown as { completers?: object[] }).completers
      if (current) {
        (editorRef.current as unknown as { completers: object[] }).completers =
          current.filter((c) => !completers.includes(c))
      }
    }
  }, [completers])

  const resolvedClassName = className ? `ace-code-editor ${className}` : 'ace-code-editor'
  return <div ref={containerRef} className={resolvedClassName} style={{ height, width: '100%' }} />
}

function readCurrentTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}
