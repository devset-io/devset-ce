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

type FunctionStudioPanelProps = {
  selectedStage: string
  existingFunctionsCount: number
  onOpenFunctionStudio: () => void
}

export const FunctionStudioPanel = React.memo(function FunctionStudioPanel({
  selectedStage,
  existingFunctionsCount,
  onOpenFunctionStudio,
}: FunctionStudioPanelProps) {
  const { t } = useI18n()
  return (
    <section className={`${FB_UI.card} shrink-0 flex flex-col gap-2 border-[var(--brand-border)] bg-[var(--brand-soft)]/60`}>
      <h3 className="m-0 text-base font-semibold text-slate-800">{t('flow.fnStudio.title')}</h3>
      <button type="button" onClick={onOpenFunctionStudio} className={`${FB_UI.primaryButton} w-full`}>
        {t('flow.fnStudio.open')}
      </button>
      <p className={FB_UI.hint}>
        {t('flow.fnStudio.activeNode', { stage: selectedStage, count: existingFunctionsCount })}
      </p>
    </section>
  )
})
