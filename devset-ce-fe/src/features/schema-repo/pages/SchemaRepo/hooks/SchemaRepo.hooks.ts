/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useDeferredValue, useEffect, useReducer, useRef } from 'react'
import type { EditorSurface, SchemaGroupKey, SchemaRepoLabels } from '../../../types/schemaRepo.types'
import type { SchemaRepoEditorViewModel, SchemaRepoGroupViewModel } from '../../../types/schemaRepo.view.types'
import { createInitialState, reducer } from '../state/SchemaRepo.reducer'
import type { SchemaRepoAction } from '../state/SchemaRepo.types'
import { useSchemaRepoEffects } from './SchemaRepo.effects'
import { useSchemaRepoSelectors } from './SchemaRepo.selectors'

type UseSchemaRepoOptions = {
  labels: SchemaRepoLabels
}

type UseSchemaRepoResult = {
  groups: SchemaRepoGroupViewModel[]
  editor: SchemaRepoEditorViewModel
  schemaSearch: string
  schemaIdDraft: string
  schemaJsonDraft: string
  schemaProtoDraft: string
  isLoading: boolean
  isBusy: boolean
  error: string | null
  startCreate: () => void
  startEdit: () => void
  cancelEdit: () => void
  saveSchema: () => Promise<void>
  selectSchema: (schemaId: string) => void
  deleteSchema: (schemaId: string) => Promise<void>
  toggleGroup: (groupKey: SchemaGroupKey) => void
  toggleMenu: (menuKey: string) => void
  setSchemaSearch: (next: string) => void
  setSchemaIdDraft: (next: string) => void
  setSchemaJsonDraft: (next: string) => void
  setSchemaProtoDraft: (next: string) => void
  setEditorSurface: (next: EditorSurface) => void
}

export function useSchemaRepo({ labels }: UseSchemaRepoOptions): UseSchemaRepoResult {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const lastAction = useRef<SchemaRepoAction | null>(null)
  const handledAction = useRef<SchemaRepoAction | null>(null)
  const deferredSchemaSearch = useDeferredValue(state.schemaSearch)

  const { groups, editor } = useSchemaRepoSelectors(state, deferredSchemaSearch, labels)
  useSchemaRepoEffects(state, dispatch, lastAction, handledAction, labels)

  function dispatchWithEffects(action: SchemaRepoAction): void {
    lastAction.current = action
    dispatch(action)
  }

  useEffect(() => {
    dispatchWithEffects({ type: 'init' })
  }, [])

  return {
    groups,
    editor,
    schemaSearch: state.schemaSearch,
    schemaIdDraft: state.schemaIdDraft,
    schemaJsonDraft: state.schemaJsonDraft,
    schemaProtoDraft: state.schemaProtoDraft,
    isLoading: state.isLoading,
    isBusy: state.isSaving || state.isDeletingSchemaId !== null,
    error: state.error,
    startCreate: () => dispatchWithEffects({ type: 'startCreate' }),
    startEdit: () => dispatchWithEffects({ type: 'startEdit' }),
    cancelEdit: () => dispatchWithEffects({ type: 'cancelEdit' }),
    saveSchema: () => { dispatchWithEffects({ type: 'saveSchema' }); return Promise.resolve() },
    selectSchema: (schemaId: string) => dispatchWithEffects({ type: 'selectSchema', schemaId }),
    deleteSchema: (schemaId: string) => { dispatchWithEffects({ type: 'deleteSchema', schemaId }); return Promise.resolve() },
    toggleGroup: (groupKey: SchemaGroupKey) => dispatchWithEffects({ type: 'toggleGroup', groupKey }),
    toggleMenu: (menuKey: string) => dispatchWithEffects({ type: 'toggleMenu', menuKey }),
    setSchemaSearch: (next: string) => dispatchWithEffects({ type: 'setSchemaSearch', value: next }),
    setSchemaIdDraft: (next: string) => dispatchWithEffects({ type: 'setSchemaIdDraft', value: next }),
    setSchemaJsonDraft: (next: string) => dispatchWithEffects({ type: 'setSchemaJsonDraft', value: next }),
    setSchemaProtoDraft: (next: string) => dispatchWithEffects({ type: 'setSchemaProtoDraft', value: next }),
    setEditorSurface: (next: EditorSurface) => dispatchWithEffects({ type: 'setEditorSurface', value: next }),
  }
}
