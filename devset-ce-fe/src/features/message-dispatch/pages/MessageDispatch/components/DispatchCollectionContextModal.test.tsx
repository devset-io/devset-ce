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
import { DispatchCollectionContextModal } from './DispatchCollectionContextModal.tsx'
import type { DispatchCollectionContextModalProps } from '../../../types/messageDispatch.view.types'

// SAFETY: test stub — every label key resolves to its own name
const stubLabels = new Proxy(
  {},
  { get: (_t, prop) => String(prop) },
) as DispatchCollectionContextModalProps['labels']

const baseProps: DispatchCollectionContextModalProps = {
  labels: stubLabels,
  isOpen: true,
  isSaving: false,
  collectionName: 'orders',
  entries: [],
  error: null,
  onClose: vi.fn(),
  onAddEntry: vi.fn(),
  onUpdateEntry: vi.fn(),
  onRemoveEntry: vi.fn(),
  onSubmit: vi.fn(),
}

describe('DispatchCollectionContextModal', () => {
  it('renders nothing when closed', () => {
    const html = renderToStaticMarkup(<DispatchCollectionContextModal {...baseProps} isOpen={false} />)
    expect(html).toBe('')
  })

  it('renders an accessible dialog with the empty state', () => {
    const html = renderToStaticMarkup(<DispatchCollectionContextModal {...baseProps} />)
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('<code>orders</code>')
    expect(html).toContain('empty')
  })

  it('renders an error message when provided', () => {
    const html = renderToStaticMarkup(<DispatchCollectionContextModal {...baseProps} error="boom" />)
    expect(html).toContain('class="dispatch-error"')
    expect(html).toContain('boom')
  })
})
