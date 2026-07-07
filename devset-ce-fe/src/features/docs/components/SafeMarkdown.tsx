/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { ReactNode } from 'react'

type SafeMarkdownProps = {
  markdown: string
  onDocLinkClick?: (docId: string) => void
  resolveHeadingId?: (level: 2 | 3, label: string) => string
}

type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; language: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'image'; alt: string; src: string }

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')

const parseTableRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())

const isLikelyTableSeparator = (line: string): boolean => /^[\s:-]*\|[\s|:-]*$/.test(line)

const isUnorderedListLine = (line: string): boolean => /^\s*[-*]\s+/.test(line)
const isOrderedListLine = (line: string): boolean => /^\s*\d+\.\s+/.test(line)
const isHeadingLine = (line: string): boolean => /^(#{1,6})\s+/.test(line)
const isCodeFenceLine = (line: string): boolean => /^```/.test(line.trim())
const isBlockquoteLine = (line: string): boolean => /^\s*>/.test(line)
const isImageLine = (line: string): boolean => /^!\[[^\]]*]\([^)]+\)\s*$/.test(line.trim())

const isBlockStart = (line: string): boolean =>
  isCodeFenceLine(line) ||
  isHeadingLine(line.trim()) ||
  isBlockquoteLine(line) ||
  isUnorderedListLine(line) ||
  isOrderedListLine(line) ||
  isImageLine(line) ||
  (line.includes('|') && line.trim().startsWith('|'))

const parseBlocks = (markdown: string): MarkdownBlock[] => {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (isCodeFenceLine(trimmed)) {
      const language = trimmed.slice(3).trim()
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !isCodeFenceLine(lines[index].trim())) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) {
        index += 1
      }
      blocks.push({ type: 'code', language, text: codeLines.join('\n') })
      continue
    }

    const headingMatch = /^(#{1,6})\s+(\S.*)$/.exec(trimmed)
    if (headingMatch) {
      const level = Math.min(6, headingMatch[1].length) as 1 | 2 | 3 | 4 | 5 | 6 // SAFETY: Math.min(6, ...) with minimum heading length 1 guarantees result is 1-6
      blocks.push({ type: 'heading', level, text: headingMatch[2].trim() })
      index += 1
      continue
    }

    const imageMatch = /^!\[([^\]]*)]\(([^)]+)\)\s*$/.exec(trimmed)
    if (imageMatch) {
      blocks.push({ type: 'image', alt: imageMatch[1].trim(), src: imageMatch[2].trim() })
      index += 1
      continue
    }

    if (line.includes('|') && index + 1 < lines.length && isLikelyTableSeparator(lines[index + 1])) {
      const headers = parseTableRow(line)
      const rows: string[][] = []
      index += 2
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(parseTableRow(lines[index]))
        index += 1
      }
      blocks.push({ type: 'table', headers, rows })
      continue
    }

    if (isUnorderedListLine(line)) {
      const items: string[] = []
      while (index < lines.length && isUnorderedListLine(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, '').trim())
        index += 1
      }
      blocks.push({ type: 'unordered-list', items })
      continue
    }

    if (isOrderedListLine(line)) {
      const items: string[] = []
      while (index < lines.length && isOrderedListLine(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, '').trim())
        index += 1
      }
      blocks.push({ type: 'ordered-list', items })
      continue
    }

    if (isBlockquoteLine(line)) {
      const quoteLines: string[] = []
      while (index < lines.length && isBlockquoteLine(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ''))
        index += 1
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n') })
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraphLines.push(lines[index].trim())
      index += 1
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') })
  }

  return blocks
}

const isSafeExternalHref = (href: string): boolean => /^(https?:|mailto:)/i.test(href)
const isSafeLocalHref = (href: string): boolean => href.startsWith('/docs/') || href.startsWith('#')

const renderInline = (
  input: string,
  onDocLinkClick?: (docId: string) => void,
  keyPrefix = 'inline',
): ReactNode[] => {
  const parts: ReactNode[] = []
  const matcher = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[([^\][]+)\]\(([^()]+)\))/g
  let cursor = 0
  let tokenIndex = 0

  const pushPlain = (value: string) => {
    if (!value) {
      return
    }
    parts.push(value)
  }

  let match = matcher.exec(input)
  while (match) {
    const [whole] = match
    const start = match.index
    if (start > cursor) {
      pushPlain(input.slice(cursor, start))
    }

    if (whole.startsWith('`')) {
      const codeText = whole.slice(1, -1)
      parts.push(
        <code key={`${keyPrefix}-code-${tokenIndex}`}>
          {codeText}
        </code>,
      )
    } else if (whole.startsWith('**')) {
      const strongText = whole.slice(2, -2)
      parts.push(
        <strong key={`${keyPrefix}-strong-${tokenIndex}`}>
          {renderInline(strongText, onDocLinkClick, `${keyPrefix}-strong-${tokenIndex}`)}
        </strong>,
      )
    } else {
      const label = match[4] ?? ''
      const href = (match[5] ?? '').trim()
      if (href.startsWith('doc:')) {
        const docId = href.slice(4).trim()
        parts.push(
          <button
            key={`${keyPrefix}-doc-${tokenIndex}`}
            type="button"
            className="docs-inline-link"
            onClick={() => onDocLinkClick?.(docId)}
          >
            {label}
          </button>,
        )
      } else if (isSafeExternalHref(href) || isSafeLocalHref(href)) {
        const openInNewTab = /^https?:/i.test(href)
        parts.push(
          <a
            key={`${keyPrefix}-link-${tokenIndex}`}
            href={href}
            target={openInNewTab ? '_blank' : undefined}
            rel={openInNewTab ? 'noreferrer noopener' : undefined}
          >
            {label}
          </a>,
        )
      } else {
        pushPlain(label || href)
      }
    }

    cursor = start + whole.length
    tokenIndex += 1
    match = matcher.exec(input)
  }

  if (cursor < input.length) {
    pushPlain(input.slice(cursor))
  }

  return parts
}

const isSafeImageSrc = (src: string): boolean => src.startsWith('/docs/')

export function SafeMarkdown({ markdown, onDocLinkClick, resolveHeadingId }: SafeMarkdownProps) {
  const blocks = parseBlocks(markdown)

  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const fallbackHeadingId = toSlug(block.text) || `section-${index}`
          const headingId =
            block.level === 2 || block.level === 3
              ? (resolveHeadingId?.(block.level, block.text) ?? fallbackHeadingId)
              : fallbackHeadingId

          if (block.level === 1) {
            return <h1 key={`h1-${index}`} id={headingId}>{renderInline(block.text, onDocLinkClick, `h1-${index}`)}</h1>
          }
          if (block.level === 2) {
            return <h2 key={`h2-${index}`} id={headingId}>{renderInline(block.text, onDocLinkClick, `h2-${index}`)}</h2>
          }
          if (block.level === 3) {
            return <h3 key={`h3-${index}`} id={headingId}>{renderInline(block.text, onDocLinkClick, `h3-${index}`)}</h3>
          }
          if (block.level === 4) {
            return <h4 key={`h4-${index}`} id={headingId}>{renderInline(block.text, onDocLinkClick, `h4-${index}`)}</h4>
          }
          if (block.level === 5) {
            return <h5 key={`h5-${index}`} id={headingId}>{renderInline(block.text, onDocLinkClick, `h5-${index}`)}</h5>
          }
          return <h6 key={`h6-${index}`} id={headingId}>{renderInline(block.text, onDocLinkClick, `h6-${index}`)}</h6>
        }

        if (block.type === 'paragraph') {
          return <p key={`p-${index}`}>{renderInline(block.text, onDocLinkClick, `p-${index}`)}</p>
        }

        if (block.type === 'unordered-list') {
          return (
            <ul key={`ul-${index}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`ul-${index}-${itemIndex}`}>{renderInline(item, onDocLinkClick, `ul-${index}-${itemIndex}`)}</li>
              ))}
            </ul>
          )
        }

        if (block.type === 'ordered-list') {
          return (
            <ol key={`ol-${index}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`ol-${index}-${itemIndex}`}>{renderInline(item, onDocLinkClick, `ol-${index}-${itemIndex}`)}</li>
              ))}
            </ol>
          )
        }

        if (block.type === 'blockquote') {
          return <blockquote key={`quote-${index}`}>{renderInline(block.text, onDocLinkClick, `quote-${index}`)}</blockquote>
        }

        if (block.type === 'code') {
          return (
            <pre key={`code-${index}`}>
              <code className={block.language ? `language-${block.language}` : undefined}>
                {block.text}
              </code>
            </pre>
          )
        }

        if (block.type === 'table') {
          return (
            <table key={`table-${index}`}>
              <thead>
                <tr>
                  {block.headers.map((header, headerIndex) => (
                    <th key={`th-${index}-${headerIndex}`}>
                      {renderInline(header, onDocLinkClick, `th-${index}-${headerIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={`tr-${index}-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`td-${index}-${rowIndex}-${cellIndex}`}>
                        {renderInline(cell, onDocLinkClick, `td-${index}-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }

        if (block.type === 'image') {
          if (!isSafeImageSrc(block.src)) {
            return <p key={`img-fallback-${index}`}>{block.alt || block.src}</p>
          }
          return <img key={`img-${index}`} src={block.src} alt={block.alt} loading="lazy" sizes="(max-width: 768px) 100vw, 720px" />
        }

        return null
      })}
    </>
  )
}
