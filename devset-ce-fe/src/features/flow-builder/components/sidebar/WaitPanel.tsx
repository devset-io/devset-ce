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
import { FB_UI } from '../../ui/ui-classes'

type WaitPanelProps = {
  open: boolean
  onToggle: (open: boolean) => void
  waitValue: string
  onWaitChange: (value: string) => void
}

export const WaitPanel = React.memo(function WaitPanel({ open, onToggle, waitValue, onWaitChange }: WaitPanelProps) {
  const { t } = useI18n()
  return (
    <CollapsibleCard title={t('flow.wait.title')} open={open} onToggle={onToggle}>
      <label className={FB_UI.label}>
        {t('flow.wait.label')}
        <input
          className={FB_UI.input}
          placeholder={t('flow.wait.placeholder')}
          value={waitValue}
          onChange={(event) => onWaitChange(event.target.value)}
        />
      </label>
      <p className={FB_UI.hint}>{t('flow.wait.hint')}</p>
    </CollapsibleCard>
  )
})
