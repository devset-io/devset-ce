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
import { ModalShell } from './ModalShell.tsx'

const render = (isOpen: boolean) =>
  renderToStaticMarkup(
    <I18nProvider>
      <ModalShell
        isOpen={isOpen}
        title="Edit step"
        subtitle="Configure the selected step"
        onClose={vi.fn()}
        zIndexClassName="z-50"
        containerClassName="max-w-[480px]"
      >
        <p>modal body</p>
      </ModalShell>
    </I18nProvider>,
  )

describe('ModalShell', () => {
  it('renders nothing when closed', () => {
    expect(render(false)).toBe('')
  })

  it('renders an accessible dialog labelled by its title', () => {
    const html = render(true)
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(html)
    expect(labelledBy).not.toBeNull()
    expect(html).toContain('Edit step')
    expect(html).toContain('modal body')
  })
})
