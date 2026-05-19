/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { translateFor, type Locale } from '../../../core/i18n/I18nProvider'
import { FUNCTION_CATALOG } from './function-catalog'

type AceCallback = (err: Error | null, items: AceCompletion[]) => void
type AceCompletion = { caption: string; snippet: string; meta: string; type?: string; score?: number; docHTML?: string }
type AceSessionLike = { getLine(row: number): string }
type AcePoint = { row: number; column: number }

// ── DSL construct definitions ──────────────────────────────────────────────────

const DSL_CONSTRUCTS: { name: string; labelKey: string; hintKey: string; snippet: string; example: string }[] = [
  {
    name: 'when',
    labelKey: 'dsl.when.label',
    hintKey: 'dsl.when.hint',
    snippet: '{\n  "when": { "\\$fn": "${1:gt(.value,0)}" },\n  "value": ${2:1},\n  "default": ${3:0}\n}',
    example: '{ "when": { "$fn": "..." }, "value": 1, "default": 0 }',
  },
  {
    name: 'repeatWhile',
    labelKey: 'dsl.repeatWhile.label',
    hintKey: 'dsl.repeatWhile.hint',
    snippet: '{\n  "repeatWhile": { "\\$fn": "${1:lt(state.entity.count,100)}" },\n  "repeat": ${2:100}\n}',
    example: '{ "repeatWhile": { "$fn": "..." }, "repeat": 100 }',
  },
  {
    name: 'repeatUntil',
    labelKey: 'dsl.repeatUntil.label',
    hintKey: 'dsl.repeatUntil.hint',
    snippet: '{\n  "repeatUntil": { "\\$fn": "${1:gte(state.entity.count,100)}" },\n  "repeat": ${2:100}\n}',
    example: '{ "repeatUntil": { "$fn": "..." }, "repeat": 100 }',
  },
  {
    name: '$fn',
    labelKey: 'dsl.$fn.label',
    hintKey: 'dsl.$fn.hint',
    snippet: '{ "\\$fn": "${1:uuid()}" }',
    example: '{ "$fn": "uuid()" }',
  },
  {
    name: '$ref',
    labelKey: 'dsl.$ref.label',
    hintKey: 'dsl.$ref.hint',
    snippet: '{ "\\$ref": "${1:fieldName}" }',
    example: '{ "$ref": "userId" }',
  },
  {
    name: '$path',
    labelKey: 'dsl.$path.label',
    hintKey: 'dsl.$path.hint',
    snippet: '{ "\\$path": "state.${1:fieldName}" }',
    example: '{ "$path": "state.userId" }',
  },
  {
    name: '.field',
    labelKey: 'dsl.dotField.label',
    hintKey: 'dsl.dotField.hint',
    snippet: '.${1:value}',
    example: '.value, .status, .id',
  },
]

// ── Completion builders ────────────────────────────────────────────────────────

function docHtml(label: string, hint: string, example: string): string {
  return `<div style="max-width:340px"><strong>${escapeHtml(label)}</strong><br/><span class="ace-fn-hint">${escapeHtml(hint)}</span><br/><br/><code style="font-family:'JetBrains Mono',monospace;font-size:11px">${escapeHtml(example)}</code></div>`
}

function buildFnCompletions(locale: Locale): AceCompletion[] {
  return FUNCTION_CATALOG.map((fn, idx) => ({
    caption: fn.name,
    snippet: buildSnippet(fn.name, fn.example),
    meta: 'fn',
    type: 'snippet',
    score: 1000 - idx,
    docHTML: docHtml(translateFor(locale, fn.label), translateFor(locale, fn.hint), fn.example),
  }))
}

function buildWrappedFnCompletions(locale: Locale): AceCompletion[] {
  return FUNCTION_CATALOG.map((fn, idx) => ({
    caption: fn.name,
    snippet: `{ "\\$fn": "${buildSnippet(fn.name, fn.example)}" }`,
    meta: '$fn',
    type: 'snippet',
    score: 1000 - idx,
    docHTML: docHtml(translateFor(locale, fn.label), translateFor(locale, fn.hint), `{ "$fn": "${fn.example}" }`),
  }))
}

function buildDslCompletions(locale: Locale): AceCompletion[] {
  return DSL_CONSTRUCTS.map((entry, idx) => ({
    caption: entry.name,
    snippet: entry.snippet,
    meta: 'dsl',
    type: 'snippet',
    score: 2000 - idx,
    docHTML: docHtml(translateFor(locale, entry.labelKey), translateFor(locale, entry.hintKey), entry.example),
  }))
}

function buildContextCompletions(prefix: string, fieldNames: string[]): AceCompletion[] {
  return fieldNames.map((name, idx) => ({
    caption: prefix + name,
    snippet: prefix + name,
    meta: 'context',
    type: 'value',
    score: 3000 - idx,
  }))
}

export type DslCompleterOptions = {
  /**
   * Bare field names available in the surrounding stage state — typically
   * derived from the loaded request's parent collection context.
   *
   * Surfaced as value-position completions:
   * - inside `"$ref": "..."` as bare names (e.g. `userId`) — `$ref` is
   *   resolved relative to the current state scope.
   * - inside `"$path": "..."` as `state.<name>` (e.g. `state.userId`) —
   *   `$path` is an absolute path from the workflow root.
   */
  contextFieldNames?: string[]
  /**
   * DSL construct captions to drop from autocomplete (e.g. `['$path']` for
   * message-dispatch, where only the relative `$ref` construct is allowed).
   * When a construct is omitted its value-position regex match is skipped too.
   */
  omitConstructs?: string[]
}

// ── Factory ────────────────────────────────────────────────────────────────────

/**
 * Creates an Ace completer for Devset DSL, bound to a specific locale.
 * Locale is captured in closure — rebuild the completer when locale changes.
 *
 * Context detection:
 * - Inside `"$fn": "..."` → raw function names + `.field` hint
 * - Inside `"$ref": "..."` → bare context field names (relative to current scope)
 * - Inside `"$path": "..."` → `state.<name>` paths (absolute from workflow root)
 * - After `{`, `,`, `:` or line start → DSL constructs + wrapped `{ "$fn": "..." }` functions
 */
export function createDslCompleter(locale: Locale, options?: DslCompleterOptions) {
  const fn = buildFnCompletions(locale)
  const wrappedFn = buildWrappedFnCompletions(locale)
  const omitted = new Set(options?.omitConstructs ?? [])
  const dsl = buildDslCompletions(locale).filter((d) => !omitted.has(d.caption))
  const dotField = dsl.find((d) => d.caption === '.field')
  const contextFieldNames = options?.contextFieldNames ?? []
  const refCompletions = buildContextCompletions('', contextFieldNames)
  const pathCompletions = buildContextCompletions('state.', contextFieldNames)
  const isRefOmitted = omitted.has('$ref')
  const isPathOmitted = omitted.has('$path')

  return {
    // Second regex enables Ace to trigger on bare words (when, repeatWhile, etc.) after { , :
    // without it, only $-prefixed identifiers would activate the completer.
    identifierRegexps: [/\$[A-Za-z.]*/, /[A-Za-z.]+/],
    getCompletions(
      _editor: unknown,
      session: AceSessionLike,
      pos: AcePoint,
      _prefix: string,
      callback: AceCallback
    ) {
      const line = session.getLine(pos.row).slice(0, pos.column)

      if (/"\$fn"\s*:\s*"([\w.]*)$/.test(line)) {
        callback(null, dotField ? [dotField, ...fn] : fn)
        return
      }
      if (!isRefOmitted && /"\$ref"\s*:\s*"([\w.-]*)$/.test(line)) {
        callback(null, refCompletions)
        return
      }
      if (!isPathOmitted && /"\$path"\s*:\s*"([\w.-]*)$/.test(line)) {
        callback(null, pathCompletions)
        return
      }
      if (/(?:^|[{,:])\s*\$?([A-Za-z]*)$/.test(line)) {
        callback(null, [...dsl, ...wrappedFn])
        return
      }
      callback(null, [])
    },
  }
}

/** Creates an Ace completer that offers only raw function names (no `{ "$fn": ... }` wrapper, no DSL constructs). */
export function createFnOnlyCompleter(locale: Locale) {
  const fn = buildFnCompletions(locale)

  return {
    identifierRegexps: [/[A-Za-z.]+/],
    getCompletions(
      _editor: unknown,
      _session: AceSessionLike,
      _pos: AcePoint,
      _prefix: string,
      callback: AceCallback
    ) {
      callback(null, fn)
    },
  }
}

// ── Snippet helpers ────────────────────────────────────────────────────────────

function buildSnippet(name: string, example: string): string {
  const open = example.indexOf('(')
  const close = example.lastIndexOf(')')
  if (open === -1 || close === -1 || close < open) return `${name}($1)`
  const args = splitTopLevelArgs(example.slice(open + 1, close))
  if (args.length === 0) return `${name}()`
  const placeholders = args.map((arg, idx) => `\${${idx + 1}:${arg.trim()}}`)
  return `${name}(${placeholders.join(',')})`
}

function splitTopLevelArgs(raw: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''
  for (const ch of raw) {
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') depth--
    if (ch === ',' && depth === 0) { out.push(current); current = ''; continue }
    current += ch
  }
  if (current.trim()) out.push(current)
  return out
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
