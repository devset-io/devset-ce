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
import { FnHintInput } from './FnHintInput'
import type { KeyValue, KeyValueKind } from '../types/key-value.types'
import './KeyModeInput.css'

interface KeyModeInputProps {
  value: KeyValue
  onChange: (value: KeyValue) => void
  disabled?: boolean
  className?: string
  inputId?: string
  modeGroupLabel?: string
}

/** Input with literal/$ref/$fn mode toggle and function autocomplete for $fn mode. */
export const KeyModeInput = React.memo(function KeyModeInput({
  value,
  onChange,
  disabled = false,
  className = '',
  inputId,
  modeGroupLabel = 'Key mode',
}: KeyModeInputProps) {
  const switchKind = (kind: KeyValueKind) => {
    if (kind === value.kind) return
    onChange({ kind, value: '' })
  }

  return (
    <div className={`key-mode-input ${className}`}>
      <div className="key-mode-input-modes" role="radiogroup" aria-label={modeGroupLabel}>
        <button type="button" role="radio" aria-checked={value.kind === 'literal'} className={`key-mode-input-btn ${value.kind === 'literal' ? 'is-active' : ''}`} onClick={() => switchKind('literal')} disabled={disabled}>literal</button>
        <button type="button" role="radio" aria-checked={value.kind === 'ref'} className={`key-mode-input-btn ${value.kind === 'ref' ? 'is-active' : ''}`} onClick={() => switchKind('ref')} disabled={disabled}>$ref</button>
        <button type="button" role="radio" aria-checked={value.kind === 'fn'} className={`key-mode-input-btn ${value.kind === 'fn' ? 'is-active' : ''}`} onClick={() => switchKind('fn')} disabled={disabled}>$fn</button>
      </div>
      {value.kind === 'fn' ? (
        <FnHintInput
          id={inputId}
          className="key-mode-input-field"
          value={value.value}
          onChange={(v) => onChange({ kind: 'fn', value: v })}
          placeholder="uuid()"
          disabled={disabled}
        />
      ) : (
        <input
          id={inputId}
          className="key-mode-input-field"
          value={value.value}
          onChange={(e) => onChange({ kind: value.kind, value: e.target.value })}
          placeholder={value.kind === 'literal' ? 'user-123' : 'currentEvent.userId'}
          disabled={disabled}
        />
      )}
    </div>
  )
})
