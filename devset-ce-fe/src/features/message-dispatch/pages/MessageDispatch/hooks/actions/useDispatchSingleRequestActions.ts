/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { Dispatch, RefObject } from 'react'
import { toast } from 'sonner'
import { useI18n } from '../../../../../../core/i18n/I18nProvider'
import {
  createCollection as createCollectionApi,
  createSingleRequest as createSingleRequestApi,
  deleteSingleRequestByName,
  getSingleRequestByName,
  patchSingleRequest,
  type SingleRequestPayload,
} from '../../../../services/message-dispatch.service'
import type { MessageDispatchAction, MessageDispatchState } from '../../state/MessageDispatch.types'
import { normalizeError } from '../../../../../../shared/utils/error'
import { DEFAULT_COLLECTION_NAME } from '../../../../message-dispatch.constants'

type UseDispatchSingleRequestActionsParams = {
  dispatch: Dispatch<MessageDispatchAction>
  stateRef: RefObject<MessageDispatchState>
  refreshCollections: (showSpinner?: boolean) => Promise<void>
  buildSingleRequestPayload: (singleRequestName: string, collectionName: string) => SingleRequestPayload
}

export function useDispatchSingleRequestActions({
  dispatch,
  stateRef,
  refreshCollections,
  buildSingleRequestPayload,
}: UseDispatchSingleRequestActionsParams) {
  const { t } = useI18n()

  const failCollection = (message: string) => {
    dispatch({ type: 'collectionsLoadFailed', error: message })
    toast.error(message)
  }

  const saveSingleRequestWithValues = async (
    collectionName: string,
    singleRequestName: string,
  ): Promise<boolean> => {
    // No collection picked → fall back to the default "Uncategorized" collection
    // (auto-created below), so scratch requests can be saved without a collection.
    const normalizedCollectionName = collectionName.trim() || DEFAULT_COLLECTION_NAME

    const normalizedSingleRequestName = singleRequestName.trim()
    if (!normalizedSingleRequestName) {
      failCollection(t('dispatch.vm.provideSingleRequestName'))
      return false
    }

    dispatch({ type: 'savingSingleRequestStarted' })
    try {
      const state = stateRef.current
      if (!state.collections.some((entry) => entry.collectionName === normalizedCollectionName)) {
        await createCollectionApi(normalizedCollectionName)
      }

      const payloadForSave = buildSingleRequestPayload(
        normalizedSingleRequestName,
        normalizedCollectionName,
      )
      const existing = state.singleRequests.find(
        (entry) =>
          entry.singleRequestName === payloadForSave.singleRequestName &&
          entry.collectionName === payloadForSave.collectionName,
      )
      const saved = existing
        ? await patchSingleRequest(existing.singleRequestName, payloadForSave)
        : await createSingleRequestApi(payloadForSave)

      dispatch({ type: 'collectionSelected', name: saved.collectionName })
      dispatch({ type: 'singleRequestSelected', name: saved.singleRequestName, collectionName: saved.collectionName })
      dispatch({ type: 'singleRequestNameChanged', value: saved.singleRequestName })
      toast.success(
        existing
          ? t('dispatch.vm.singleRequestUpdated', { requestName: saved.singleRequestName })
          : t('dispatch.vm.singleRequestCreated', { requestName: saved.singleRequestName }),
      )
      await refreshCollections(false)
      return true
    } catch (error) {
      failCollection(normalizeError(error, t('dispatch.vm.saveSingleRequestFailed')))
      return false
    } finally {
      dispatch({ type: 'savingSingleRequestCompleted' })
    }
  }

  const saveCurrentAsSingleRequest = async () => {
    const state = stateRef.current
    // Update writes back to the SOURCE the tab was opened from (its saved-request
    // collection), not whatever collection is currently selected in the sidebar.
    return saveSingleRequestWithValues(
      state.loadedSingleRequestCollectionName || state.selectedCollectionName,
      state.selectedSingleRequestName || state.singleRequestNameRaw || '',
    )
  }

  const renameSingleRequest = async (
    collectionName: string,
    currentSingleRequestName: string,
    nextSingleRequestName: string,
  ): Promise<boolean> => {
    const normalizedCollectionName = collectionName.trim()
    const normalizedCurrentName = currentSingleRequestName.trim()
    const normalizedNextName = nextSingleRequestName.trim()

    if (!normalizedCollectionName || !normalizedCurrentName) {
      return false
    }
    if (!normalizedNextName) {
      failCollection(t('dispatch.vm.provideNewSingleRequestName'))
      return false
    }
    if (normalizedCurrentName === normalizedNextName) {
      return true
    }

    const state = stateRef.current
    if (
      state.singleRequests.some(
        (entry) =>
          entry.collectionName === normalizedCollectionName &&
          entry.singleRequestName === normalizedNextName,
      )
    ) {
      failCollection(t('dispatch.vm.singleRequestAlreadyExistsInCollection', {
        requestName: normalizedNextName,
        collectionName: normalizedCollectionName,
      }))
      return false
    }

    dispatch({ type: 'savingSingleRequestStarted' })
    try {
      const local =
        state.singleRequests.find(
          (entry) =>
            entry.collectionName === normalizedCollectionName &&
            entry.singleRequestName === normalizedCurrentName,
        ) ?? null
      const source = local ?? (await getSingleRequestByName(normalizedCurrentName))
      if (!source || source.collectionName !== normalizedCollectionName) {
        throw new Error(
          t('dispatch.vm.singleRequestNotFoundInCollection', {
            requestName: normalizedCurrentName,
            collectionName: normalizedCollectionName,
          }),
        )
      }

      const renamed = await createSingleRequestApi({
        ...source,
        singleRequestName: normalizedNextName,
        collectionName: normalizedCollectionName,
      })
      try {
        await deleteSingleRequestByName(normalizedCurrentName)
      } catch {
        // Intentional: rollback — delete the newly created entry if the old one could not be removed
        await deleteSingleRequestByName(normalizedNextName).catch(() => {
          // Intentional: best-effort cleanup — if rollback deletion also fails, proceed to throw
        })
        throw new Error(
          t('dispatch.vm.singleRequestRenameFailed', { requestName: normalizedCurrentName }),
        )
      }

      const currentState = stateRef.current
      if (
        currentState.selectedSingleRequestName === normalizedCurrentName &&
        currentState.loadedSingleRequestCollectionName === normalizedCollectionName
      ) {
        dispatch({ type: 'singleRequestSelected', name: renamed.singleRequestName, collectionName: normalizedCollectionName })
        dispatch({ type: 'singleRequestNameChanged', value: renamed.singleRequestName })
      }
      toast.success(t('dispatch.vm.singleRequestRenamed', { requestName: renamed.singleRequestName }))
      await refreshCollections(false)
      return true
    } catch (error) {
      failCollection(normalizeError(error, t('dispatch.vm.renameSingleRequestFailed')))
      return false
    } finally {
      dispatch({ type: 'savingSingleRequestCompleted' })
    }
  }

  const doesSingleRequestExist = (collectionName: string, singleRequestName: string): boolean => {
    const normalizedCollectionName = collectionName.trim()
    const normalizedSingleRequestName = singleRequestName.trim()
    if (!normalizedCollectionName || !normalizedSingleRequestName) {
      return false
    }

    return stateRef.current.singleRequests.some(
      (entry) =>
        entry.collectionName === normalizedCollectionName &&
        entry.singleRequestName === normalizedSingleRequestName,
    )
  }

  // Always opens a saved request in a NEW tab at the front of the bar (each click
  // gets its own mirror, even if the request is already open elsewhere). The tab
  // keeps a savedRequestRef to its source so Update writes back there. The form is
  // hydrated from the catalog by useDispatchTabHydration once the tab is active.
  const openSavedRequestInNewTab = (entry: SingleRequestPayload) => {
    dispatch({
      type: 'tabOpenedFromSavedRequest',
      ref: { collectionName: entry.collectionName, singleRequestName: entry.singleRequestName },
    })
  }

  const loadSingleRequest = async (singleRequestName: string, collectionName?: string) => {
    const normalizedName = singleRequestName.trim()
    if (!normalizedName) {
      return
    }

    const normalizedCollectionName = collectionName?.trim() ?? ''
    const state = stateRef.current

    const local =
      state.singleRequests.find(
        (entry) =>
          entry.singleRequestName === normalizedName &&
          (!normalizedCollectionName || entry.collectionName === normalizedCollectionName),
      ) ??
      state.singleRequests.find(
        (entry) =>
          entry.singleRequestName === normalizedName &&
          entry.collectionName === state.selectedCollectionName,
      ) ??
      null

    if (local) {
      openSavedRequestInNewTab(local)
      return
    }

    try {
      const loaded = await getSingleRequestByName(normalizedName)
      if (!loaded) {
        throw new Error(t('dispatch.vm.singleRequestNotFound', { requestName: normalizedName }))
      }
      // Ensure the fetched request is in the catalog so the hydration effect can populate the tab.
      if (
        !stateRef.current.singleRequests.some(
          (entry) =>
            entry.singleRequestName === loaded.singleRequestName &&
            entry.collectionName === loaded.collectionName,
        )
      ) {
        dispatch({ type: 'singleRequestsLoaded', requests: [...stateRef.current.singleRequests, loaded] })
      }
      openSavedRequestInNewTab(loaded)
    } catch (error) {
      failCollection(normalizeError(error, t('dispatch.vm.loadSingleRequestFailed')))
    }
  }

  const deleteSingleRequest = async (singleRequestName: string, collectionName?: string) => {
    const normalizedName = singleRequestName.trim()
    if (!normalizedName) {
      return
    }

    const normalizedCollectionName = collectionName?.trim() ?? ''
    try {
      await deleteSingleRequestByName(normalizedName)
      const state = stateRef.current
      if (
        state.selectedSingleRequestName === normalizedName &&
        (!normalizedCollectionName ||
          state.loadedSingleRequestCollectionName === normalizedCollectionName)
      ) {
        dispatch({ type: 'loadedSelectionCleared' })
      }
      toast.success(t('dispatch.vm.singleRequestDeleted', { requestName: normalizedName }))
      await refreshCollections(false)
    } catch (error) {
      failCollection(normalizeError(error, t('dispatch.vm.deleteSingleRequestFailed')))
    }
  }

  return {
    saveSingleRequestWithValues,
    saveCurrentAsSingleRequest,
    renameSingleRequest,
    doesSingleRequestExist,
    loadSingleRequest,
    deleteSingleRequest,
  }
}
