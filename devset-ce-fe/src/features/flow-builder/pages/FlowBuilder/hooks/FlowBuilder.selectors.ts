/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { createEmptyBootstrap } from '../../../services/workflow-bootstrap.service'
import type { FlowBuilderBootstrap } from '../../../types/flowBuilder.types'
import type { FlowBuilderViewData } from '../state/FlowBuilder.types'

type FlowBuilderLocationState = { bootstrap?: FlowBuilderBootstrap } | null

export function useFlowBuilderSelectors(): FlowBuilderViewData {
  const location = useLocation()
  return useMemo<FlowBuilderViewData>(() => {
    const routeState = location.state as FlowBuilderLocationState // SAFETY: React Router location.state is typed as unknown; callers set this shape via navigate()
    const bootstrap = routeState?.bootstrap ?? createEmptyBootstrap()
    const canvasKey = routeState?.bootstrap
      ? `flow-revision-${location.key}`
      : 'flow-revision-initial'
    return { bootstrap, canvasKey }
  }, [location.key, location.state])
}
