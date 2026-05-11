/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useCallback } from 'react'
import { useKafkaLive } from '../hooks/KafkaLive.hooks'
import { KafkaLiveEmptyState } from './KafkaLiveEmptyState'
import { KafkaLiveScopeBar } from './KafkaLiveScopeBar'
import { KafkaLiveMessageStream } from './KafkaLiveMessageStream'
import { KafkaLiveDetailPanel } from './KafkaLiveDetailPanel'
import { KafkaLiveJsonModal } from './KafkaLiveJsonModal'

/** Orchestration shell for the Kafka Live Data page. */
export function KafkaLivePage() {
  const { state, viewData, dispatch } = useKafkaLive()

  const onOpenFullscreen = useCallback(() => dispatch({ type: 'openJsonModal' }), [dispatch])
  const onCloseModal = useCallback(() => dispatch({ type: 'closeJsonModal' }), [dispatch])
  const onSelectMessage = useCallback(
    (key: { partition: number; offset: number }) => dispatch({ type: 'messageSelected', ...key }),
    [dispatch],
  )
  const onLoadMore = useCallback(() => dispatch({ type: 'fetchOlderMessages' }), [dispatch])
  const onConnectorChange = useCallback((name: string) => dispatch({ type: 'connectorSelected', name }), [dispatch])
  const onTopicChange = useCallback((topic: string) => dispatch({ type: 'topicSelected', topic }), [dispatch])
  const onSearchChange = useCallback((query: string) => dispatch({ type: 'searchChanged', query }), [dispatch])
  const onSetMode = useCallback((mode: 'live' | 'fetch') => dispatch({ type: 'setMode', mode }), [dispatch])
  const onFetch = useCallback(() => dispatch({ type: 'fetchMessages' }), [dispatch])

  if (state.error && !viewData.hasSubscription) {
    return (
      <div className="klive-root">
        <div className="klive-error">{state.error}</div>
      </div>
    )
  }

  if (!viewData.hasSubscription) {
    return (
      <div className="klive-root">
        <KafkaLiveEmptyState
          connectorOptions={viewData.connectorOptions}
          selectedConnectorName={state.selectedConnectorName}
          topicOptions={viewData.topicOptions}
          isLoadingTopics={state.isLoadingTopics}
          onConnectorChange={(name) => dispatch({ type: 'connectorSelected', name })}
          onTopicSelect={(topic) => dispatch({ type: 'topicSelected', topic })}
        />
      </div>
    )
  }

  return (
    <div className="klive-root">
      <KafkaLiveScopeBar
        selectedConnectorName={state.selectedConnectorName}
        selectedTopic={state.selectedTopic}
        mode={state.mode}
        searchQuery={state.searchQuery}
        messageCount={viewData.messageCount}
        isLoadingMessages={state.isLoadingMessages}
        connectorOptions={viewData.connectorOptions}
        topicOptions={viewData.topicOptions}
        onConnectorChange={onConnectorChange}
        onTopicChange={onTopicChange}
        onSearchChange={onSearchChange}
        onSetMode={onSetMode}
        onFetch={onFetch}
      />

      {state.error && <div className="klive-error-banner">{state.error}</div>}

      <div className="klive-content">
        <KafkaLiveMessageStream
          messages={viewData.filteredMessages}
          selectedKey={state.selectedMessageKey}
          isLoading={state.isLoadingMessages}
          hasMore={viewData.hasMore}
          isLoadingOlder={viewData.isLoadingOlder}
          isLiveMode={state.mode === 'live'}
          onSelectMessage={onSelectMessage}
          onLoadMore={onLoadMore}
        />
        <KafkaLiveDetailPanel
          message={viewData.selectedMessage}
          formattedValue={viewData.formattedValue}
          isValueJson={viewData.isValueJson}
          onOpenFullscreen={onOpenFullscreen}
        />
      </div>

      <KafkaLiveJsonModal
        isOpen={state.isJsonModalOpen}
        message={viewData.selectedMessage}
        formattedValue={viewData.formattedValue}
        isValueJson={viewData.isValueJson}
        onClose={onCloseModal}
      />
    </div>
  )
}
