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
import { useI18n } from '../../../../core/i18n/I18nProvider'
import { CollapsibleCard } from '../CollapsibleCard'
import { FunctionExpressionBuilder } from '../FunctionExpressionBuilder'
import { FB_UI } from '../../ui/ui-classes'

type RepeatConfig = { repeat: string; repeatWhileFn: string; repeatUntilFn: string } | null

type RepeatPanelProps = {
  open: boolean
  onToggle: (open: boolean) => void
  draft: RepeatConfig
  onDraftChange: (field: 'repeat' | 'repeatWhileFn' | 'repeatUntilFn', value: string) => void
  showRepeatWhile: boolean
  showRepeatUntil: boolean
  onShowRepeatWhile: (next: boolean) => void
  onShowRepeatUntil: (next: boolean) => void
}

export const RepeatPanel = React.memo(function RepeatPanel({
  open,
  onToggle,
  draft,
  onDraftChange,
  showRepeatWhile,
  showRepeatUntil,
  onShowRepeatWhile,
  onShowRepeatUntil,
}: RepeatPanelProps) {
  const { t } = useI18n()
  return (
    <CollapsibleCard title={t('flow.repeat.title')} open={open} onToggle={onToggle}>
      <label className={FB_UI.label}>
        {t('flow.repeat.maxIterations')}
        <input
          className={FB_UI.input}
          type="number"
          min={1}
          placeholder={t('flow.repeat.placeholderIterations')}
          value={draft?.repeat ?? ''}
          onChange={(event) => onDraftChange('repeat', event.target.value)}
        />
      </label>

      {!showRepeatWhile ? (
        <button type="button" className={`${FB_UI.secondaryButton} px-3 py-1.5 text-xs`} onClick={() => onShowRepeatWhile(true)}>
          {t('flow.repeat.addWhile')}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label className={FB_UI.label}>{t('flow.repeat.whileLabel')}</label>
            <button
              type="button"
              className={`${FB_UI.secondaryButton} px-2 py-1 text-xs`}
              onClick={() => {
                onShowRepeatWhile(false)
                onDraftChange('repeatWhileFn', '')
              }}
            >
              {t('flow.repeat.remove')}
            </button>
          </div>
          <FunctionExpressionBuilder
            value={draft?.repeatWhileFn ?? ''}
            onChange={(next) => onDraftChange('repeatWhileFn', next)}
            expressionPlaceholder={t('flow.repeat.placeholderWhile')}
            showInlineExpressionEditor={false}
          />
        </div>
      )}

      {!showRepeatUntil ? (
        <button type="button" className={`${FB_UI.secondaryButton} px-3 py-1.5 text-xs`} onClick={() => onShowRepeatUntil(true)}>
          {t('flow.repeat.addUntil')}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label className={FB_UI.label}>{t('flow.repeat.untilLabel')}</label>
            <button
              type="button"
              className={`${FB_UI.secondaryButton} px-2 py-1 text-xs`}
              onClick={() => {
                onShowRepeatUntil(false)
                onDraftChange('repeatUntilFn', '')
              }}
            >
              {t('flow.repeat.remove')}
            </button>
          </div>
          <FunctionExpressionBuilder
            value={draft?.repeatUntilFn ?? ''}
            onChange={(next) => onDraftChange('repeatUntilFn', next)}
            expressionPlaceholder={t('flow.repeat.placeholderUntil')}
            showInlineExpressionEditor={false}
          />
        </div>
      )}

      <p className={FB_UI.hint}>{t('flow.repeat.hint')}</p>
    </CollapsibleCard>
  )
})
