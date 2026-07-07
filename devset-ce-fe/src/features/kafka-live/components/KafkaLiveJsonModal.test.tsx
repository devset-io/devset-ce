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
import { I18nProvider } from '../../../core/i18n/I18nProvider'
import { KafkaLiveJsonModal } from './KafkaLiveJsonModal.tsx'
import type { KafkaMessage } from '../services/kafka-live.service'

const message: KafkaMessage = {
  partition: 2,
  offset: 41,
  timestamp: '2026-01-01T00:00:00Z',
  key: 'order-1',
  headers: {},
  value: '{"a":1}',
}

const render = (isOpen: boolean, msg: KafkaMessage | null = message) =>
  renderToStaticMarkup(
    <I18nProvider>
      <KafkaLiveJsonModal
        isOpen={isOpen}
        message={msg}
        formattedValue={'{\n  "a": 1\n}'}
        isValueJson
        onClose={vi.fn()}
      />
    </I18nProvider>,
  )

describe('KafkaLiveJsonModal', () => {
  it('renders nothing when closed or without a message', () => {
    expect(render(false)).toBe('')
    expect(render(true, null)).toBe('')
  })

  it('renders the dialog with message metadata when open', () => {
    const html = render(true)
    expect(html).toContain('role="dialog"')
    expect(html).toContain('P2')
    expect(html).toContain('offset 41')
    expect(html).toContain('order-1')
  })
})
