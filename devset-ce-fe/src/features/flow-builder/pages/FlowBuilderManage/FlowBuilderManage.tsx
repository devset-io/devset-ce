/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect } from 'react'
import { FlowBuilderManageView } from './components/FlowBuilderManageView'
import { useFlowBuilderManage } from './hooks/FlowBuilderManage.hooks'

export function FlowBuilderManage() {
  const { viewData, dispatch } = useFlowBuilderManage()

  useEffect(() => {
    dispatch({ type: 'init' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <FlowBuilderManageView data={viewData} onAction={dispatch} />
}
