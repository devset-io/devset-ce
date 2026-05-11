/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { FlowBuilderManageAction, FlowBuilderManageState } from './FlowBuilderManage.types'

export function reducer(state: FlowBuilderManageState, action: FlowBuilderManageAction): FlowBuilderManageState {
  switch (action.type) {
    case 'init':
      return { ...state, isLoading: true, loadError: null }
    case 'loadSuccess':
      return { ...state, isLoading: false, workflows: action.workflows, loadError: null }
    case 'loadFailed':
      return { ...state, isLoading: false, loadError: action.error }
    case 'openImport':
      return { ...state, isImportOpen: true, importError: null }
    case 'closeImport':
      return { ...state, isImportOpen: false, importError: null }
    case 'importRawChanged':
      return { ...state, importRaw: action.value }
    case 'clearImport':
      return { ...state, importRaw: '', importError: null }
    case 'applyImport':
      return { ...state, importError: null }
    case 'applyImportFailed':
      return { ...state, importError: action.error }
    case 'openWorkflow':
    case 'cloneWorkflow':
    case 'deleteWorkflow':
      return { ...state, busyId: action.workflowId }
    case 'workflowActionFinished':
      return { ...state, busyId: null }
    case 'deleteWorkflowSucceeded':
      return { ...state, busyId: null, isLoading: true, loadError: null }
    case 'createNew':
      return { ...state }
    default:
      return state
  }
}
