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
import { FB_UI } from '../../ui/ui-classes'
import type { QueryConfig } from '../../types'

type QueryPanelProps = {
  selectedStage: string
  queryConfig: QueryConfig | null
  onOpenQueryEditor: () => void
}

export const QueryPanel = React.memo(function QueryPanel({
  selectedStage,
  queryConfig,
  onOpenQueryEditor,
}: QueryPanelProps) {
  const { t } = useI18n()
  const hasQuery = queryConfig !== null && queryConfig.select.length > 0

  return (
    <section className={`${FB_UI.card} shrink-0 flex flex-col gap-2 border-[var(--line-200)]`}>
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--brand-ink)]" fill="none">
          <ellipse cx="12" cy="6" rx="7" ry="2.6" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6 M5 12v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-6" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <h3 className="m-0 text-sm font-semibold text-[var(--ink-900)]">{t('flow.query.panelTitle')}</h3>
      </div>
      <button
        type="button"
        onClick={onOpenQueryEditor}
        className={`${hasQuery ? FB_UI.secondaryButton : FB_UI.primaryButton} w-full`}
      >
        {hasQuery ? t('flow.query.editQuery') : t('flow.query.addQuery')}
      </button>
      {hasQuery ? (
        <p className={FB_UI.hint}>
          {t('flow.query.panelSummary', {
            stage: selectedStage,
            connection: queryConfig.connection,
            collection: queryConfig.collection,
            selectCount: queryConfig.select.length,
            findCount: queryConfig.find.length,
          })}
        </p>
      ) : (
        <p className={FB_UI.hint}>{t('flow.query.panelHint')}</p>
      )}
    </section>
  )
})
