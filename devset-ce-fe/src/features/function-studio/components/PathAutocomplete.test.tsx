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
import { PathAutocomplete } from './PathAutocomplete.tsx'

describe('PathAutocomplete', () => {
  it('renders a combobox input wired to a listbox via aria-controls', () => {
    const html = renderToStaticMarkup(
      <PathAutocomplete value="entity." onChange={vi.fn()} options={['entity.id', 'entity.name']} />,
    )
    expect(html).toContain('role="combobox"')
    expect(html).toContain('aria-autocomplete="list"')
    const controlsMatch = /aria-controls="([^"]+)"/.exec(html)
    expect(controlsMatch).not.toBeNull()
  })

  it('keeps the suggestion list closed until the input is focused', () => {
    const html = renderToStaticMarkup(
      <PathAutocomplete value="" onChange={vi.fn()} options={['entity.id']} />,
    )
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('role="listbox"')
  })
})
