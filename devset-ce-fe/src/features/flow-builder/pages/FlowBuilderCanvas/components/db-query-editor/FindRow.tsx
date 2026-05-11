/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useCallback, useMemo } from 'react'
import { useI18n } from '../../../../../../core/i18n/I18nProvider'
import { FnHintInput } from '../../../../../../shared/components/FnHintInput'
import { HintInput } from '../../../../../../shared/components/HintInput'
import type { HintItem } from '../../../../../../shared/components/HintInput'
import type { QueryFindEntry, QueryValue } from '../../../../types'
import { FIND_OPS, valueToRaw, parseLiteralText, valueToText, parseValueText } from './db-query.utils'

const INPUT_CLS = 'w-full rounded-lg border border-[var(--line-300)] bg-[var(--panel-soft)] px-2 py-1 font-mono text-xs text-[var(--ink-900)] outline-none focus:border-[var(--brand)]'

const MODE_BTN = 'rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors'
const MODE_BTN_ACTIVE = `${MODE_BTN} bg-[var(--brand)] text-white`
const MODE_BTN_INACTIVE = `${MODE_BTN} text-[var(--ink-500)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink-900)]`

type ValueKind = QueryValue['kind']

export const FindRow = React.memo(function FindRow({
  entry,
  fieldOptions,
  stateKeys,
  onUpdate,
  onRemove,
}: {
  entry: QueryFindEntry
  fieldOptions: string[]
  stateKeys: string[]
  onUpdate: (patch: Partial<QueryFindEntry>) => void
  onRemove: () => void
}) {
  const { t } = useI18n()
  const kind = entry.value?.kind ?? 'literal'
  const rawValue = valueToRaw(entry.value)

  const pathItems: HintItem[] = useMemo(
    () => stateKeys.map((k) => ({ value: k, label: k })),
    [stateKeys],
  )

  const switchKind = useCallback((newKind: ValueKind) => {
    if (newKind === kind) return
    const cleared: QueryValue = { kind: newKind, value: '' }
    if (newKind === 'literal') {
      onUpdate({ value: cleared, default: undefined })
    } else {
      onUpdate({ value: cleared })
    }
  }, [kind, onUpdate])

  return (
    <div className="border-b border-[var(--line-300)] px-2.5 py-1.5 last:border-b-0">
      <div className="grid grid-cols-[1.1fr_0.7fr_1.5fr_28px] items-center gap-2">
        <select
          value={entry.field}
          onChange={(e) => onUpdate({ field: e.target.value })}
          className={INPUT_CLS}
        >
          <option value="">{t('flow.query.chooseField')}</option>
          {fieldOptions.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select
          value={entry.op}
          onChange={(e) => onUpdate({ op: e.target.value })}
          className={INPUT_CLS}
        >
          {FIND_OPS.map((op) => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <button type="button" className={kind === 'literal' ? MODE_BTN_ACTIVE : MODE_BTN_INACTIVE} onClick={() => switchKind('literal')}>
              {t('flow.query.modeLiteral')}
            </button>
            <button type="button" className={kind === 'path' ? MODE_BTN_ACTIVE : MODE_BTN_INACTIVE} onClick={() => switchKind('path')}>
              {t('flow.query.modePath')}
            </button>
            <button type="button" className={kind === 'fn' ? MODE_BTN_ACTIVE : MODE_BTN_INACTIVE} onClick={() => switchKind('fn')}>
              {t('flow.query.modeFn')}
            </button>
          </div>
          {kind === 'fn' ? (
            <FnHintInput
              value={rawValue}
              onChange={(v) => onUpdate({ value: { kind: 'fn', value: v } })}
              placeholder="choice(A,B,C)"
              className={INPUT_CLS}
            />
          ) : kind === 'path' ? (
            <HintInput
              value={rawValue}
              onChange={(v) => onUpdate({ value: { kind: 'path', value: v } })}
              items={pathItems}
              placeholder="steps.prev-step.status"
              className={INPUT_CLS}
            />
          ) : (
            <input
              value={rawValue}
              onChange={(e) => onUpdate({ value: parseLiteralText(e.target.value) })}
              placeholder={t('flow.query.value')}
              className={INPUT_CLS}
            />
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--line-300)] text-[var(--ink-500)] hover:border-[#d37d8c] hover:bg-[#fff2f4] hover:text-[#b4233c] dark:hover:border-[#6b2a35] dark:hover:bg-[#3a1c22] dark:hover:text-[#f5b0bb]"
          aria-label={t('flow.query.removeFilter')}
        >
          &times;
        </button>
      </div>
      {kind === 'path' ? (
        <div className="mt-1 flex items-center gap-2 pl-1">
          {entry.default ? (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[var(--ink-500)]">&darr; fallback:</span>
              <input
                value={valueToText(entry.default)}
                onChange={(e) => onUpdate({ default: parseValueText(e.target.value) })}
                placeholder="default"
                className="w-32 rounded-md border border-[var(--line-300)] bg-[var(--panel-soft)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-900)] outline-none focus:border-[var(--brand)]"
              />
              <button
                type="button"
                onClick={() => onUpdate({ default: undefined })}
                className="text-[10.5px] text-[var(--ink-500)] underline-offset-2 hover:text-[#b4233c] hover:underline"
              >
                {t('flow.query.removeFallback')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onUpdate({ default: { kind: 'literal', value: '' } })}
              className="text-[10.5px] text-[var(--ink-500)] underline-offset-2 hover:text-[var(--brand-ink)] hover:underline"
            >
              + {t('flow.query.addFallback')}
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
})
