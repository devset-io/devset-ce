/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { Dispatch } from 'react'
import type { MessageDispatchAction, MessageDispatchState } from '../../state/MessageDispatch.types'
import { entriesToMap } from './collectionContext.utils'
import { normalizeError } from '../../../../../../shared/utils/error'

export function findDuplicateFields(fields: string[]): string[] {
  const seen = new Set<string>()
  const dups: string[] = []
  for (const raw of fields) {
    const field = raw.trim()
    if (!field) continue
    if (seen.has(field)) dups.push(field)
    else seen.add(field)
  }
  return dups
}

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

export type SaveCollectionContextDeps = {
  state: MessageDispatchState
  dispatch: Dispatch<MessageDispatchAction>
  t: TranslateFn
  patchCollectionContextApi: (
    collectionName: string,
    collectionContext: Record<string, unknown>,
  ) => Promise<unknown>
  refreshCollections: (showSpinner?: boolean) => Promise<void>
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

/**
 * Save the collection-context modal contents back to the server.
 *
 * Lives outside the React hook so it can be unit-tested without rendering:
 * the hook supplies the live dispatch / i18n / API / toast bindings, while
 * tests supply spies. Behaviour:
 *  - no-op when modal has no collection name
 *  - validates against duplicate field names and dispatches an error if any
 *  - otherwise calls patchCollectionContextApi and closes the modal on success,
 *    or surfaces the error via dispatch + onError on failure
 */
export async function performSaveCollectionContext(
  deps: SaveCollectionContextDeps,
): Promise<void> {
  const { state, dispatch, t, patchCollectionContextApi, refreshCollections, onSuccess, onError } =
    deps

  const collectionName = state.collectionContextModalCollectionName.trim()
  if (!collectionName) {
    return
  }

  const duplicates = findDuplicateFields(state.collectionContextModalEntries.map((e) => e.field))
  if (duplicates.length > 0) {
    dispatch({
      type: 'collectionContextModalErrorSet',
      error: t('dispatch.collectionContext.errorDuplicateField', { field: duplicates[0] }),
    })
    return
  }

  const payload = entriesToMap(state.collectionContextModalEntries)

  dispatch({ type: 'savingCollectionContextStarted' })
  try {
    await patchCollectionContextApi(collectionName, payload)
    onSuccess(t('dispatch.collectionContext.saved', { collectionName }))
    dispatch({ type: 'collectionContextModalClosed' })
    await refreshCollections(false)
  } catch (error) {
    const message = normalizeError(error, t('dispatch.collectionContext.saveFailed'))
    dispatch({ type: 'collectionContextModalErrorSet', error: message })
    onError(message)
  } finally {
    dispatch({ type: 'savingCollectionContextCompleted' })
  }
}
