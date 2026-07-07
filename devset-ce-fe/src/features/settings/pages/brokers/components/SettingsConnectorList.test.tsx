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
import { SettingsConnectorList } from './SettingsConnectorList.tsx'
import type { ConnectorStatus } from '../../../../../shared/services/kafka-connectors.service'

const connector: ConnectorStatus = {
  type: 'kafka',
  name: 'local-kafka',
  endpoint: 'localhost:9092',
  producerConnected: true,
  consumerConnected: false,
  authenticated: true,
}

const baseProps = {
  connectors: [connector],
  activeConnectorName: 'local-kafka',
  editingConnectorName: null,
  activeConnector: connector,
  connectionsError: null as string | null,
  isRefreshing: false,
  isSubmitting: false,
  onAction: vi.fn(),
}

const render = (props: Partial<typeof baseProps> = {}) =>
  renderToStaticMarkup(
    <I18nProvider>
      <SettingsConnectorList {...baseProps} {...props} />
    </I18nProvider>,
  )

describe('SettingsConnectorList', () => {
  it('renders connector rows as keyboard-accessible buttons', () => {
    const html = render()
    expect(html).toMatch(/role="button"[^>]*tabindex="0"/i)
    expect(html).toContain('local-kafka')
    expect(html).toContain('localhost:9092')
  })

  it('marks the active connector row', () => {
    const html = render()
    expect(html).toContain('is-active')
  })

  it('shows the empty placeholder without connectors', () => {
    const html = render({ connectors: [] })
    expect(html).toContain('settings-empty')
  })

  it('surfaces the connections error', () => {
    const html = render({ connectionsError: 'broker down' })
    expect(html).toContain('broker down')
  })
})
