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
import { DispatchWireFormatConfig } from './DispatchWireFormatConfig.tsx'
import type {
  DispatchRequestCardLabels,
  DispatchWireFormatViewModel,
} from '../../../types/messageDispatch.view.types'

// SAFETY: test stub — every label key resolves to its own name
const stubLabels = new Proxy({}, { get: (_t, prop) => String(prop) }) as DispatchRequestCardLabels

const wireFormat: DispatchWireFormatViewModel = {
  enabled: false,
  prefixSource: 'messagePrefix',
  prefixValue: '',
  prefixValueError: null,
}

const baseProps = {
  labels: stubLabels,
  contentMode: 'protobuf' as const,
  isSending: false,
  isProtoPayloadEnabled: true,
  isProtoEditingBlocked: false,
  wireFormat,
  onWireFormatEnabledChange: vi.fn(),
  onWireFormatSourceChange: vi.fn(),
  onWireFormatPrefixValueChange: vi.fn(),
}

describe('DispatchWireFormatConfig', () => {
  it('renders nothing for non-protobuf content', () => {
    const html = renderToStaticMarkup(<DispatchWireFormatConfig {...baseProps} contentMode="json" />)
    expect(html).toBe('')
  })

  it('renders the tooltip trigger as a focusable native button', () => {
    const html = renderToStaticMarkup(<DispatchWireFormatConfig {...baseProps} />)
    expect(html).toContain('wireFormatTitle')
    expect(html).toMatch(/<button[^>]*aria-label="wireFormatTooltipAria"/)
    expect(html).not.toContain('tabindex="0"')
  })

  it('renders the enable checkbox unchecked when wire format is disabled', () => {
    const html = renderToStaticMarkup(<DispatchWireFormatConfig {...baseProps} />)
    expect(html).toContain('type="checkbox"')
    expect(html).not.toContain('checked')
  })
})
