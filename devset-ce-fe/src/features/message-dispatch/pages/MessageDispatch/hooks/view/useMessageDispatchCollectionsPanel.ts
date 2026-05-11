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
import type { MessageDispatchState } from '../../state/MessageDispatch.types'
import type { MessageDispatchCallbacks } from '../../../../types/dispatch.adapter.types'
import type { SingleRequestPayload } from '../../../../services/message-dispatch.service'
import { toCollectionMenuKey, toRequestMenuKey } from '../../../../message-dispatch.utils'
import type {
  DispatchCollectionItemViewModel,
  DispatchCollectionsPanelLabels,
  DispatchCollectionsPanelProps,
} from '../../../../types/messageDispatch.view.types'

type UseMessageDispatchCollectionsPanelDerived = {
  selectedCollectionRequests: SingleRequestPayload[]
  singleRequestCountsByCollection: Record<string, number>
}

type UseMessageDispatchCollectionsPanelOptions = {
  labels: DispatchCollectionsPanelLabels
  state: MessageDispatchState
  derived: UseMessageDispatchCollectionsPanelDerived
  callbacks: MessageDispatchCallbacks
  isBusy: boolean
}

export function useMessageDispatchCollectionsPanel({
  labels,
  state,
  derived,
  callbacks,
  isBusy,
}: UseMessageDispatchCollectionsPanelOptions): DispatchCollectionsPanelProps {
  const collections = useMemo<DispatchCollectionItemViewModel[]>(
    () =>
      state.collections.map((collection) => {
        const isExpanded = state.selectedCollectionName === collection.collectionName
        const requests = isExpanded ? derived.selectedCollectionRequests : []

        return {
          collectionName: collection.collectionName,
          requestCount: derived.singleRequestCountsByCollection[collection.collectionName] ?? 0,
          isExpanded,
          isMenuOpen:
            state.openCollectionsMenuKey === toCollectionMenuKey(collection.collectionName),
          requests: requests.map((request) => {
            const editingRequest = state.editingRequest
            const isEditing =
              editingRequest?.collectionName === request.collectionName &&
              editingRequest.currentName === request.singleRequestName

            return {
              collectionName: request.collectionName,
              singleRequestName: request.singleRequestName,
              isSelected: state.selectedSingleRequestName === request.singleRequestName,
              isMenuOpen:
                state.openCollectionsMenuKey ===
                toRequestMenuKey(request.collectionName, request.singleRequestName),
              isEditing,
              editingName: isEditing
                ? editingRequest.nextName
                : request.singleRequestName,
            }
          }),
        }
      }),
    [
      state.editingRequest,
      state.openCollectionsMenuKey,
      state.collections,
      state.selectedCollectionName,
      derived.selectedCollectionRequests,
      state.selectedSingleRequestName,
      derived.singleRequestCountsByCollection,
    ],
  )

  const handleCollectionToggle = (collectionName: string, isExpanded: boolean) => {
    if (isExpanded) {
      callbacks.setSelectedCollectionName('')
      callbacks.setSingleRequestNameRaw('')
      return
    }

    void callbacks.loadCollection(collectionName)
  }

  const handleCollectionMenuToggle = (collectionName: string) => {
    callbacks.toggleCollectionsMenu(toCollectionMenuKey(collectionName))
  }

  const handleCloneCollection = (collectionName: string) => {
    callbacks.closeCollectionsMenu()
    void callbacks.cloneCollection(collectionName)
  }

  const handleDeleteCollection = (collectionName: string) => {
    callbacks.closeCollectionsMenu()
    void callbacks.deleteCollection(collectionName)
  }

  const handleRequestMenuToggle = (requestName: string, collectionName: string) => {
    callbacks.toggleCollectionsMenu(toRequestMenuKey(collectionName, requestName))
  }

  const handleRequestRenameStart = (collectionName: string, requestName: string) => {
    if (isBusy) {
      return
    }

    callbacks.closeCollectionsMenu()
    callbacks.startRequestRename(collectionName, requestName)
  }

  const handleRequestRenameSubmit = async () => {
    if (!state.editingRequest) {
      return
    }

    const success = await callbacks.renameSingleRequest(
      state.editingRequest.collectionName,
      state.editingRequest.currentName,
      state.editingRequest.nextName,
    )

    if (success) {
      callbacks.clearEditingRequest()
    }
  }

  const handleDeleteRequest = (requestName: string, collectionName: string) => {
    callbacks.closeCollectionsMenu()
    void callbacks.deleteSingleRequest(requestName, collectionName)
  }

  return {
    labels,
    isBusy,
    isLoading: state.isCollectionsLoading,
    isRefreshing: state.isCollectionsRefreshing,
    error: state.collectionsError,
    newCollectionNameRaw: state.newCollectionNameRaw,
    collections,
    onRefresh: () => {
      void callbacks.refreshCollections()
    },
    onNewCollectionNameChange: callbacks.setNewCollectionNameRaw,
    onCreateCollection: callbacks.createCollection,
    onCollectionToggle: handleCollectionToggle,
    onCollectionMenuToggle: handleCollectionMenuToggle,
    onCloneCollection: handleCloneCollection,
    onDeleteCollection: handleDeleteCollection,
    onRequestSelect: (requestName: string, collectionName: string) => {
      void callbacks.loadSingleRequest(requestName, collectionName)
    },
    onRequestMenuToggle: handleRequestMenuToggle,
    onRequestRenameStart: handleRequestRenameStart,
    onEditingRequestNameChange: callbacks.updateEditingRequestName,
    onRequestRenameSubmit: handleRequestRenameSubmit,
    onRequestRenameCancel: callbacks.clearEditingRequest,
    onDeleteRequest: handleDeleteRequest,
  }
}
