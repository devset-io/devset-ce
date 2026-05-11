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

type EmitPanelProps = {
  open: boolean
  onToggle: (open: boolean) => void
  emitMode: 'true' | 'false' | 'null' | 'fn'
  emitFnExpression: string
  onModeChange: (mode: 'true' | 'false' | 'null' | 'fn') => void
  onFnChange: (value: string) => void
}

export const EmitPanel = React.memo(function EmitPanel({
  open,
  onToggle,
  emitMode,
  emitFnExpression,
  onModeChange,
  onFnChange,
}: EmitPanelProps) {
  const { t } = useI18n()
  return (
    <CollapsibleCard title={t('flow.emit.title')} open={open} onToggle={onToggle}>
      <label className={FB_UI.label}>
        {t('flow.emit.label')}
        <select
          className={FB_UI.input}
          value={emitMode}
          onChange={(event) => onModeChange(event.target.value as 'true' | 'false' | 'null' | 'fn')} // SAFETY: select options are constrained to these four literal values
        >
          <option value="true">{t('flow.emit.always')}</option>
          <option value="false">{t('flow.emit.neverFalse')}</option>
          <option value="null">{t('flow.emit.neverNull')}</option>
          <option value="fn">{t('flow.emit.fn')}</option>
        </select>
      </label>
      {emitMode === 'fn' ? (
        <>
          <label className={FB_UI.label}>{t('flow.emit.conditionLabel')}</label>
          <FunctionExpressionBuilder
            value={emitFnExpression}
            onChange={onFnChange}
            expressionPlaceholder={t('flow.emit.placeholder')}
            showInlineExpressionEditor={false}
          />
        </>
      ) : null}
      <p className={FB_UI.hint}>{t('flow.emit.hint')}</p>
    </CollapsibleCard>
  )
})
