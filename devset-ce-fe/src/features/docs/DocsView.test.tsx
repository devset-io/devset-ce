/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nProvider } from '../../core/i18n/I18nProvider'
import { DocsView } from './DocsView.tsx'

describe('DocsView', () => {
  it('renders the docs shell with navigation and article headings', () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <DocsView />
      </I18nProvider>,
    )
    expect(html).toContain('<nav')
    expect(html).toContain('<article')
    // collectHeadings feeds the table of contents with slugged anchors
    expect(html).toMatch(/href="#[a-z0-9-]+"/)
  })
})
