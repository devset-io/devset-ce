/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type {
  FlowBuilderStartScreenAction,
  FlowBuilderStartScreenState,
} from './FlowBuilderStartScreen.types'

export function reducer(
  state: FlowBuilderStartScreenState,
  action: FlowBuilderStartScreenAction,
): FlowBuilderStartScreenState {
  switch (action.type) {
    case 'init':
      return { ...state, isLoadingExisting: true, existingError: null }
    case 'loadExistingSuccess':
      return { ...state, isLoadingExisting: false, workflows: action.workflows, existingError: null }
    case 'loadExistingFailed':
      return { ...state, isLoadingExisting: false, existingError: action.error }
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
    case 'openSavedWorkflow':
      return { ...state, openingCatalogFlowId: action.workflowId, catalogOpenError: null }
    case 'openSavedWorkflowFailed':
      return { ...state, openingCatalogFlowId: null, catalogOpenError: action.error }
    case 'createNew':
      return state
    default:
      return state
  }
}
