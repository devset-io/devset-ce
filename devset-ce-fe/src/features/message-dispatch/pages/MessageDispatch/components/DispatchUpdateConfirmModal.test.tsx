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
import { DispatchUpdateConfirmModal } from './DispatchUpdateConfirmModal.tsx'
import type { DispatchRequestCardLabels } from '../../../types/messageDispatch.view.types'

// SAFETY: test stub — every label key resolves to its own name
const stubLabels = new Proxy({}, { get: (_t, prop) => String(prop) }) as DispatchRequestCardLabels

const baseProps = {
  labels: stubLabels,
  isSavingSingleRequest: false,
  onUpdateConfirmClose: vi.fn(),
  onUpdateConfirmSubmit: vi.fn(),
}

const openConfirm = {
  isOpen: true,
  message: 'Save changes to request "create-order" in collection "orders"?',
}

describe('DispatchUpdateConfirmModal', () => {
  it('renders nothing when closed', () => {
    const html = renderToStaticMarkup(
      <DispatchUpdateConfirmModal {...baseProps} updateConfirm={{ ...openConfirm, isOpen: false }} />,
    )
    expect(html).toBe('')
  })

  it('renders an accessible dialog with the confirmation message when open', () => {
    const html = renderToStaticMarkup(
      <DispatchUpdateConfirmModal {...baseProps} updateConfirm={openConfirm} />,
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('updateConfirmTitle')
    expect(html).toContain('Save changes to request &quot;create-order&quot; in collection &quot;orders&quot;?')
  })
})
