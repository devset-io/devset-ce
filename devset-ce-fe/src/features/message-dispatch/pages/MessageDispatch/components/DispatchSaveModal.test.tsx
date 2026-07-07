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
import { DispatchSaveModal } from './DispatchSaveModal.tsx'
import type { DispatchRequestCardLabels } from '../../../types/messageDispatch.view.types'

// SAFETY: test stub — every label key resolves to its own name
const stubLabels = new Proxy({}, { get: (_t, prop) => String(prop) }) as DispatchRequestCardLabels

const baseProps = {
  labels: stubLabels,
  isSavingSingleRequest: false,
  onSaveModalClose: vi.fn(),
  onSaveModalSubmit: vi.fn(),
  onSaveCollectionNameChange: vi.fn(),
  onSaveRequestNameChange: vi.fn(),
}

const openModal = {
  isOpen: true,
  collectionName: 'orders',
  requestName: 'create-order',
  collectionOptions: ['orders', 'payments'],
}

describe('DispatchSaveModal', () => {
  it('renders nothing when closed', () => {
    const html = renderToStaticMarkup(
      <DispatchSaveModal {...baseProps} saveModal={{ ...openModal, isOpen: false }} />,
    )
    expect(html).toBe('')
  })

  it('renders an accessible dialog with form fields when open', () => {
    const html = renderToStaticMarkup(<DispatchSaveModal {...baseProps} saveModal={openModal} />)
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('saveModalTitle')
    expect(html).toContain('value="orders"')
    expect(html).toContain('value="create-order"')
    expect(html).toContain('<option value="payments">')
  })

  it('does not close on backdrop click handlers — dismissal is handled globally', () => {
    const html = renderToStaticMarkup(<DispatchSaveModal {...baseProps} saveModal={openModal} />)
    expect(html).toContain('class="dispatch-save-modal-backdrop"')
  })
})
