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

export const EmptyNodeToolsPanel = React.memo(function EmptyNodeToolsPanel() {
  const { t } = useI18n()
  return (
    <section className={`${FB_UI.card} shrink-0 flex flex-col gap-2`}>
      <h3 className="m-0 text-base font-semibold text-slate-800">{t('flow.nodeTools.title')}</h3>
      <p className={FB_UI.hint}>{t('flow.nodeTools.description')}</p>
    </section>
  )
})
