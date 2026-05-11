/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { FlowBuilderCanvasView } from './components/FlowBuilderCanvasView'
import { useFlowBuilderCanvas } from './hooks/FlowBuilderCanvas.hooks'
import type { FlowBuilderBootstrap } from '../../types/flowBuilder.types'

type FlowBuilderCanvasProps = {
  bootstrap: FlowBuilderBootstrap
}

export function FlowBuilderCanvas({ bootstrap }: FlowBuilderCanvasProps) {
  const { viewData, dispatch } = useFlowBuilderCanvas(bootstrap)

  return <FlowBuilderCanvasView data={viewData} onAction={dispatch} />
}
