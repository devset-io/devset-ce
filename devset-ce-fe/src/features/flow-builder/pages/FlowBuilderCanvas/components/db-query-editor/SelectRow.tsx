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
import { HintInput } from '../../../../../../shared/components/HintInput'
import type { HintItem } from '../../../../../../shared/components/HintInput'
import type { QuerySelectEntry } from '../../../../types'
import { valueToText, parseValueText } from './db-query.utils'

const INPUT_CLS = 'w-full rounded-lg border border-[var(--line-300)] bg-[var(--panel-soft)] px-2 py-1 font-mono text-xs text-[var(--ink-900)] outline-none focus:border-[var(--brand)]'

export const SelectRow = React.memo(function SelectRow({
  entry,
  fieldOptions,
  stateKeys,
  onUpdate,
  onRemove,
}: {
  entry: QuerySelectEntry
  fieldOptions: string[]
  stateKeys: string[]
  onUpdate: (patch: Partial<QuerySelectEntry>) => void
  onRemove: () => void
}) {
  const { t } = useI18n()

  const pathItems: HintItem[] = useMemo(
    () => stateKeys.map((k) => ({ value: k, label: k })),
    [stateKeys],
  )

  return (
    <div className="grid grid-cols-[1.1fr_18px_1.4fr_1.4fr_28px] items-center gap-2 border-b border-[var(--line-300)] px-2.5 py-1.5 last:border-b-0">
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
      <span className="text-center text-xs text-[var(--ink-500)]">&rarr;</span>
      <HintInput
        value={entry.statePath}
        onChange={(v) => onUpdate({ statePath: v })}
        items={pathItems}
        placeholder="state.path"
        className={INPUT_CLS}
      />
      {entry.default ? (
        <div className="flex items-center gap-1.5">
          <input
            value={valueToText(entry.default)}
            onChange={(e) => onUpdate({ default: parseValueText(e.target.value) })}
            placeholder="default"
            className={INPUT_CLS}
          />
          <button
            type="button"
            onClick={() => onUpdate({ default: undefined })}
            className="shrink-0 text-[10.5px] text-[var(--ink-500)] underline-offset-2 hover:text-[#b4233c] hover:underline"
          >
            &times;
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onUpdate({ default: { kind: 'literal', value: '' } })}
          className="self-center justify-self-start text-[11px] text-[var(--ink-500)] underline-offset-2 hover:text-[var(--brand-ink)] hover:underline"
        >
          + def
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--line-300)] text-[var(--ink-500)] hover:border-[#d37d8c] hover:bg-[#fff2f4] hover:text-[#b4233c] dark:hover:border-[#6b2a35] dark:hover:bg-[#3a1c22] dark:hover:text-[#f5b0bb]"
        aria-label={t('flow.query.removeMapping')}
      >
        &times;
      </button>
    </div>
  )
})
