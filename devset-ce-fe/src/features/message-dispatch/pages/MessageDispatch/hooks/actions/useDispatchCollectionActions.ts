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
  deleteCollectionByName,
  getCollectionByName,
} from '../../../../services/message-dispatch.service'
import type { MessageDispatchAction, MessageDispatchState } from '../../state/MessageDispatch.types'
import { toSavedRequestsErrorMessage } from '../utils/dispatchSavedRequests.utils'

type UseDispatchCollectionActionsParams = {
  dispatch: Dispatch<MessageDispatchAction>
  stateRef: RefObject<MessageDispatchState>
  refreshCollections: (showSpinner?: boolean) => Promise<void>
}

export function useDispatchCollectionActions({
  dispatch,
  stateRef,
  refreshCollections,
}: UseDispatchCollectionActionsParams) {
  const { t } = useI18n()

  const failCollection = (message: string) => {
    dispatch({ type: 'collectionsLoadFailed', error: message })
    toast.error(message)
  }

  const createCollection = async () => {
    const normalizedName = stateRef.current.newCollectionNameRaw.trim()
    if (!normalizedName) {
      failCollection(t('dispatch.vm.provideCollectionName'))
      return
    }

    try {
      const created = await createCollectionApi(normalizedName)
      const nextSelectedCollection = created.collectionName.trim() || normalizedName
      dispatch({ type: 'newCollectionNameChanged', value: '' })
      dispatch({ type: 'collectionSelected', name: nextSelectedCollection })
      dispatch({ type: 'loadedSelectionCleared' })
      toast.success(t('dispatch.vm.collectionCreated', { collectionName: nextSelectedCollection }))
      await refreshCollections(false)
    } catch (error) {
      failCollection(toSavedRequestsErrorMessage(error, t('dispatch.vm.createCollectionFailed')))
    }
  }

  const loadCollection = async (collectionName: string) => {
    const normalizedName = collectionName.trim()
    if (!normalizedName) {
      return
    }

    try {
      const details = await getCollectionByName(normalizedName)
      dispatch({ type: 'collectionSelected', name: details.collection.collectionName || normalizedName })
      dispatch({ type: 'loadedSelectionCleared' })
    } catch (error) {
      failCollection(toSavedRequestsErrorMessage(error, t('dispatch.vm.loadCollectionFailed')))
    }
  }

  const deleteCollection = async (collectionName: string) => {
    const normalizedName = collectionName.trim()
    if (!normalizedName) {
      return
    }

    try {
      await deleteCollectionByName(normalizedName)
      const state = stateRef.current
      if (state.loadedSingleRequestCollectionName === normalizedName) {
        dispatch({ type: 'singleRequestSelected', name: state.selectedSingleRequestName, collectionName: null })
      }
      if (state.selectedCollectionName === normalizedName) {
        dispatch({ type: 'collectionSelected', name: '' })
        dispatch({ type: 'loadedSelectionCleared' })
      }
      toast.success(t('dispatch.vm.collectionDeleted', { collectionName: normalizedName }))
      await refreshCollections(false)
    } catch (error) {
      failCollection(toSavedRequestsErrorMessage(error, t('dispatch.vm.deleteCollectionFailed')))
    }
  }

  const cloneCollection = async (collectionName: string) => {
    const normalizedName = collectionName.trim()
    if (!normalizedName) {
      return
    }

    const cloneCollectionName = `${normalizedName}-clone`
    if (stateRef.current.collections.some((entry) => entry.collectionName === cloneCollectionName)) {
      failCollection(t('dispatch.vm.cloneCollectionExists', { collectionName: cloneCollectionName }))
      return
    }

    dispatch({ type: 'savingSingleRequestStarted' })
    try {
      const details = await getCollectionByName(normalizedName)
      const sourceRequests =
        details.singleRequests.length > 0
          ? details.singleRequests
          : stateRef.current.singleRequests.filter((entry) => entry.collectionName === normalizedName)

      await createCollectionApi(cloneCollectionName)

      for (const request of sourceRequests) {
        await createSingleRequestApi({
          ...request,
          singleRequestName: `${request.singleRequestName}-clone`,
          collectionName: cloneCollectionName,
        })
      }

      dispatch({ type: 'collectionSelected', name: cloneCollectionName })
      dispatch({ type: 'loadedSelectionCleared' })
      toast.success(
        t('dispatch.vm.collectionCloned', {
          source: normalizedName,
          target: cloneCollectionName,
        }),
      )
      await refreshCollections(false)
    } catch (error) {
      failCollection(toSavedRequestsErrorMessage(error, t('dispatch.vm.cloneCollectionFailed')))
    } finally {
      dispatch({ type: 'savingSingleRequestCompleted' })
    }
  }

  return {
    createCollection,
    loadCollection,
    deleteCollection,
    cloneCollection,
  }
}
