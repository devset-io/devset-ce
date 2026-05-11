/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

// ──────────────────────────────────────────────────────────────
// PlaygroundPage — thin orchestration shell
//
// This is the page-level component for the Playground feature.
// It does NOT contain any business logic, API calls, or state
// management. All business logic lives in the hooks layer.
// ──────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../../../../core/i18n/I18nProvider'
import { createBootstrapFromPayload } from '../../../flow-builder/services/workflow-bootstrap.service'
import type { DslPayload } from '../../../flow-builder/types'
import { Playground } from './components/Playground'
import { usePlaygroundPage } from './hooks/Playground.hooks'

export function PlaygroundPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()

  const { dispatch, viewData, labels } = usePlaygroundPage({
    t,
    incomingDslPayload: (location.state as { incomingDslPayload?: unknown } | null)?.incomingDslPayload, // SAFETY: React Router location.state is typed as unknown; callers set this shape via navigate()
    onOpenFlowBuilderEditor: (payload: DslPayload, isPersisted: boolean) => {
      navigate('/flow-builder/editor', {
        state: { bootstrap: createBootstrapFromPayload(payload, { isPersisted }) },
      })
    },
    onOpenFlowBuilderHome: () => navigate('/flow-builder/manage'),
    onNavigateBack: () => navigate(-1),
  })

  useEffect(() => {
    dispatch({ type: 'init' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <Playground {...viewData} labels={labels} />
}
