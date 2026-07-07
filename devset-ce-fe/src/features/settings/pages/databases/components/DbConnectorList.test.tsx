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
import { I18nProvider } from '../../../../../core/i18n/I18nProvider'
import { DbConnectorList } from './DbConnectorList.tsx'
import type { DbConnectorStatus } from '../../../../../shared/services/db-connectors.service'

const connector: DbConnectorStatus = {
  type: 'mongodb',
  name: 'orders-db',
  connectionString: 'mongodb://user:secret@localhost:27017/orders',
  database: 'orders',
  connected: true,
  authenticated: true,
}

const baseProps = {
  connectors: [connector],
  editingConnectorName: null,
  connectionsError: null,
  isRefreshing: false,
  isSubmitting: false,
  onAction: vi.fn(),
}

const render = (props: Partial<typeof baseProps> = {}) =>
  renderToStaticMarkup(
    <I18nProvider>
      <DbConnectorList {...baseProps} {...props} />
    </I18nProvider>,
  )

describe('DbConnectorList', () => {
  it('renders connector rows as keyboard-accessible buttons', () => {
    const html = render()
    expect(html).toMatch(/role="button"[^>]*tabindex="0"/i)
    expect(html).toContain('orders-db')
  })

  it('masks credentials in the connection string', () => {
    const html = render()
    expect(html).not.toContain('secret')
    // URL#toString percent-encodes the mask bullets
    expect(html).toContain('mongodb://user:%E2%80%A2%E2%80%A2%E2%80%A2%E2%80%A2@')
  })

  it('shows the empty placeholder without connectors', () => {
    const html = render({ connectors: [] })
    expect(html).not.toContain('orders-db')
  })
})
