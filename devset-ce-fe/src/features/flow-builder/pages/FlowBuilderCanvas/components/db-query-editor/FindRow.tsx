/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useMemo } from 'react'
import { useI18n } from '../../../../../../core/i18n/I18nProvider'
import { QueryValueEditor } from '../../../../../../shared/components/QueryValueEditor'
import type { HintItem } from '../../../../../../shared/components/HintInput'
import type { QueryFindEntry, QueryValue } from '../../../../types'
import { FIND_OPS, valueToText, parseValueText } from './db-query.utils'

const INPUT_CLS = 'w-full rounded-lg border border-[var(--line-300)] bg-[var(--panel-soft)] px-2 py-1 font-mono text-xs text-[var(--ink-900)] outline-none focus:border-[var(--brand)]'

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

  const pathItems: HintItem[] = useMemo(
    () => stateKeys.map((k) => ({ value: k, label: k })),
    [stateKeys],
  )

  const handleValueChange = (next: QueryValue) => {
    // Switching to literal clears the `default` (fallback) — fallbacks only apply to path.
    if (next.kind === 'literal' && entry.value?.kind !== 'literal') {
      onUpdate({ value: next, default: undefined })
      return
    }
    onUpdate({ value: next })
  }

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
        <QueryValueEditor
          value={entry.value ?? { kind: 'literal', value: '' }}
          onChange={handleValueChange}
          labels={{
            modeLiteral: t('flow.query.modeLiteral'),
            modePath: t('flow.query.modePath'),
            modeFn: t('flow.query.modeFn'),
          }}
          placeholders={{
            literal: t('flow.query.value'),
            path: 'steps.prev-step.status',
            fn: 'choice(A,B,C)',
          }}
          pathHints={pathItems}
          inputClassName={INPUT_CLS}
        />
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
