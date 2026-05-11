/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { Suspense, lazy } from 'react'
import type { AceEditorProps } from './AceEditor'

const AceEditor = lazy(() =>
  import('./AceEditor').then((mod) => ({ default: mod.AceEditor }))
)

/**
 * Public entrypoint for the Ace (AWS Cloud9) code editor. Lazy-loads Ace so
 * the engine doesn't ship in the initial bundle.
 */
export function CodeEditor(props: AceEditorProps) {
  const height = props.height ?? '320px'
  return (
    <Suspense fallback={<CodeEditorSkeleton height={height} className={props.className} />}>
      <AceEditor {...props} />
    </Suspense>
  )
}

function CodeEditorSkeleton({ height, className }: { height: string; className?: string }) {
  const cn = className ? `ace-code-editor ace-code-editor--loading ${className}` : 'ace-code-editor ace-code-editor--loading'
  return (
    <div className={cn} style={{ height }} aria-busy="true">
      <div className="ace-code-editor-skeleton">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
