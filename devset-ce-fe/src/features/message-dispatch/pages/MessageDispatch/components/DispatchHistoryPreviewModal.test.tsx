/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DispatchHistoryPreviewModal } from './DispatchHistoryPreviewModal.tsx'
import type { DispatchHistoryPreviewModalProps } from '../../../types/messageDispatch.view.types'

// SAFETY: test stub — every field resolves to its own name
const stub = <T,>(): T => new Proxy({}, { get: (_t, prop) => String(prop) }) as T

describe('DispatchHistoryPreviewModal', () => {
  it('renders nothing without an entry', () => {
    const html = renderToStaticMarkup(
      <DispatchHistoryPreviewModal
        labels={stub<DispatchHistoryPreviewModalProps['labels']>()}
        entry={null}
        onClose={vi.fn()}
      />,
    )
    expect(html).toBe('')
  })

  it('renders an accessible dialog with entry details', () => {
    const html = renderToStaticMarkup(
      <DispatchHistoryPreviewModal
        labels={stub<DispatchHistoryPreviewModalProps['labels']>()}
        entry={stub<NonNullable<DispatchHistoryPreviewModalProps['entry']>>()}
        onClose={vi.fn()}
      />,
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('<code>runId</code>')
    expect(html).toContain('<code>workflowId</code>')
    expect(html).toContain('class="dispatch-history-modal-backdrop"')
  })
})
