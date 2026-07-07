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
import { SafeMarkdown } from './SafeMarkdown.tsx'

const render = (markdown: string, onDocLinkClick?: (docId: string) => void) =>
  renderToStaticMarkup(<SafeMarkdown markdown={markdown} onDocLinkClick={onDocLinkClick} />)

describe('SafeMarkdown headings', () => {
  it('renders heading levels with slug ids', () => {
    const html = render('# Title\n\n## Section One\n\n### Sub Section')
    expect(html).toContain('<h1 id="title">Title</h1>')
    expect(html).toContain('<h2 id="section-one">Section One</h2>')
    expect(html).toContain('<h3 id="sub-section">Sub Section</h3>')
  })

  it('does not treat a hash line without text as a heading', () => {
    const html = render('#   ')
    expect(html).not.toContain('<h1')
  })

  it('normalizes CRLF line endings', () => {
    const html = render('## First\r\n\r\nBody text')
    expect(html).toContain('<h2 id="first">First</h2>')
    expect(html).toContain('<p>Body text</p>')
  })
})

describe('SafeMarkdown inline rendering', () => {
  it('renders inline code and bold text', () => {
    const html = render('Use `stage()` for **strong** words')
    expect(html).toContain('<code>stage()</code>')
    expect(html).toContain('<strong>strong</strong>')
  })

  it('renders safe external links with rel and target', () => {
    const html = render('See [docs](https://example.com) now')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer noopener"')
  })

  it('renders doc: links as buttons', () => {
    const html = render('Read [intro](doc:getting-started)', vi.fn())
    expect(html).toContain('class="docs-inline-link"')
    expect(html).toContain('>intro</button>')
  })

  it('renders unsafe links as plain text', () => {
    const html = render('Bad [click me](javascript:alert(1)) link')
    expect(html).not.toContain('<a')
    expect(html).toContain('click me')
  })
})

describe('SafeMarkdown blocks', () => {
  it('renders tables with separator rows', () => {
    const html = render('| Name | Value |\n| --- | --- |\n| a | 1 |\n| b | 2 |')
    expect(html).toContain('<table>')
    expect(html).toContain('<th>Name</th>')
    expect(html).toContain('<td>a</td>')
    expect(html).toContain('<td>2</td>')
  })

  it('renders unordered and ordered lists', () => {
    const html = render('- one\n- two\n\n1. first\n2. second')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>one</li>')
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>second</li>')
  })

  it('renders blockquotes and fenced code blocks', () => {
    const html = render('> quoted line\n\n```json\n{ "a": 1 }\n```')
    expect(html).toContain('<blockquote>quoted line</blockquote>')
    expect(html).toContain('class="language-json"')
    expect(html).toContain('&quot;a&quot;: 1')
  })

  it('renders safe images and falls back to text for unsafe sources', () => {
    const html = render('![diagram](/docs/img.png)\n\n![evil](https://evil.example/x.png)')
    expect(html).toContain('<img src="/docs/img.png" alt="diagram"')
    expect(html).not.toContain('evil.example')
    expect(html).toContain('<p>evil</p>')
  })
})
