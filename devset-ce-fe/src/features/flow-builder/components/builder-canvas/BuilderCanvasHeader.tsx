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
import { FB_TOOLBAR } from '../../ui/ui-classes'

type BuilderCanvasHeaderProps = {
  onAddStep: () => void
  onReset: () => void
  canAddStep: boolean
}

export const BuilderCanvasHeader = React.memo(function BuilderCanvasHeader({
  onAddStep,
  onReset,
  canAddStep,
}: BuilderCanvasHeaderProps) {
  const { t } = useI18n()
  return (
    <header className={FB_TOOLBAR.bar}>
      <div>
        <h3 className={FB_TOOLBAR.barTitle}>{t('flow.canvas.title')}</h3>
        <p className={FB_TOOLBAR.barSubtitle}>{t('flow.canvas.description')}</p>
      </div>
      <div className={FB_TOOLBAR.actions}>
        <button
          type="button"
          className={FB_TOOLBAR.button}
          onClick={onAddStep}
          disabled={!canAddStep}
          title={canAddStep ? undefined : t('flow.canvas.addStageDisabled')}
        >
          {t('flow.canvas.addStage')}
        </button>
        <button type="button" className={FB_TOOLBAR.buttonGhost} onClick={onReset}>
          {t('flow.canvas.reset')}
        </button>
      </div>
    </header>
  )
})
