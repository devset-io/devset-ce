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

type NodeInspectorPanelProps = {
  open: boolean
  onToggle: (open: boolean) => void
  title: string
  stage: string
  onChange: (field: 'title' | 'stage', value: string) => void
  onDelete: () => void
}

export const NodeInspectorPanel = React.memo(function NodeInspectorPanel({
  open,
  onToggle,
  title,
  stage,
  onChange,
  onDelete,
}: NodeInspectorPanelProps) {
  const { t } = useI18n()
  return (
    <CollapsibleCard title={t('flow.inspector.title')} open={open} onToggle={onToggle}>
      <label className={FB_UI.label}>
        {t('flow.inspector.labelTitle')}
        <input
          className={FB_UI.input}
          value={title}
          onChange={(event) => onChange('title', event.target.value)}
        />
      </label>
      <label className={FB_UI.label}>
        {t('flow.inspector.labelStage')}
        <input
          className={FB_UI.input}
          value={stage}
          onChange={(event) => onChange('stage', event.target.value)}
        />
      </label>
      <div className="mt-1 border-t border-[var(--line-300)] pt-2">
        <button
          type="button"
          className="w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-100"
          onClick={onDelete}
        >
          {t('flow.inspector.delete')}
        </button>
      </div>
    </CollapsibleCard>
  )
})
