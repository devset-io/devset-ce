/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React from 'react'
import type { QueryValue } from '../../features/flow-builder/types'
import { FnHintInput } from './FnHintInput'
import { HintInput, type HintItem } from './HintInput'

const DEFAULT_INPUT_CLS = 'w-full rounded-lg border border-[var(--line-300)] bg-[var(--panel-soft)] px-2 py-1 font-mono text-xs text-[var(--ink-900)] outline-none focus:border-[var(--brand)]'

const MODE_BTN = 'rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors'
const MODE_BTN_ACTIVE = `${MODE_BTN} bg-[var(--brand)] text-white`
const MODE_BTN_INACTIVE = `${MODE_BTN} text-[var(--ink-500)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink-900)]`

type ValueKind = QueryValue['kind']

export type QueryValueEditorLabels = {
  modeLiteral: string
  modePath: string
  modeFn: string
}

export type QueryValueEditorPlaceholders = {
  literal?: string
  path?: string
  fn?: string
}

export interface QueryValueEditorProps {
  value: QueryValue
  onChange: (value: QueryValue) => void
  labels: QueryValueEditorLabels
  placeholders?: QueryValueEditorPlaceholders
  pathHints?: HintItem[]
  inputClassName?: string
  disabled?: boolean
  /**
   * `stacked` (default): mode buttons above the input — useful in narrow
   * columns.
   * `inline`: mode buttons and the input share a single row — useful when
   * caller has enough horizontal space and wants a one-line row.
   */
  layout?: 'stacked' | 'inline'
}

/** Reads the editable inner text of a QueryValue, ignoring DSL prefixes. */
function valueToRaw(value: QueryValue): string {
  if (value.value === null) return 'null'
  if (value.value === undefined) return ''
  return String(value.value)
}

/** Coerces literal text input to its closest JSON primitive. */
function coerceLiteralText(text: string): QueryValue {
  const t = text.trim()
  if (t === 'null') return { kind: 'literal', value: null }
  if (t === 'true') return { kind: 'literal', value: true }
  if (t === 'false') return { kind: 'literal', value: false }
  if (/^-?\d+(\.\d+)?$/.test(t)) return { kind: 'literal', value: Number(t) }
  return { kind: 'literal', value: text }
}

/**
 * Switches a QueryValue to the requested kind, resetting the inner value.
 * No-op when the value is already in that kind.
 */
function switchKind(kind: ValueKind, current: QueryValue): QueryValue {
  if (current.kind === kind) return current
  return { kind, value: '' }
}

/**
 * Tri-modal value editor (literal / path / function) used by the DB query
 * filter rows and the collection context modal. The DSL prefixes (`${...}`,
 * `=...`) are serialization concerns owned by callers — this component only
 * deals with the raw inner value plus a `kind` discriminator.
 */
export const QueryValueEditor = React.memo(function QueryValueEditor({
  value,
  onChange,
  labels,
  placeholders,
  pathHints,
  inputClassName,
  disabled,
  layout = 'stacked',
}: QueryValueEditorProps) {
  const cls = inputClassName ?? DEFAULT_INPUT_CLS
  const rawValue = valueToRaw(value)
  const wrapperCls = layout === 'inline' ? 'flex items-center gap-1' : 'flex flex-col gap-1'
  const inputWrapperCls = layout === 'inline' ? 'flex-1 min-w-0' : ''

  return (
    <div className={wrapperCls}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={value.kind === 'literal' ? MODE_BTN_ACTIVE : MODE_BTN_INACTIVE}
          onClick={() => onChange(switchKind('literal', value))}
          disabled={disabled}
        >
          {labels.modeLiteral}
        </button>
        <button
          type="button"
          className={value.kind === 'path' ? MODE_BTN_ACTIVE : MODE_BTN_INACTIVE}
          onClick={() => onChange(switchKind('path', value))}
          disabled={disabled}
        >
          {labels.modePath}
        </button>
        <button
          type="button"
          className={value.kind === 'fn' ? MODE_BTN_ACTIVE : MODE_BTN_INACTIVE}
          onClick={() => onChange(switchKind('fn', value))}
          disabled={disabled}
        >
          {labels.modeFn}
        </button>
      </div>
      <div className={inputWrapperCls}>
        {value.kind === 'fn' ? (
          <FnHintInput
            value={rawValue}
            onChange={(v) => onChange({ kind: 'fn', value: v })}
            placeholder={placeholders?.fn ?? 'uuid()'}
            className={cls}
            disabled={disabled}
          />
        ) : value.kind === 'path' ? (
          pathHints && pathHints.length > 0 ? (
            <HintInput
              value={rawValue}
              onChange={(v) => onChange({ kind: 'path', value: v })}
              items={pathHints}
              placeholder={placeholders?.path ?? 'state.path'}
              className={cls}
              disabled={disabled}
            />
          ) : (
            <input
              value={rawValue}
              onChange={(e) => onChange({ kind: 'path', value: e.target.value })}
              placeholder={placeholders?.path ?? 'state.path'}
              className={cls}
              disabled={disabled}
            />
          )
        ) : (
          <input
            value={rawValue}
            onChange={(e) => onChange(coerceLiteralText(e.target.value))}
            placeholder={placeholders?.literal ?? ''}
            className={cls}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  )
})
