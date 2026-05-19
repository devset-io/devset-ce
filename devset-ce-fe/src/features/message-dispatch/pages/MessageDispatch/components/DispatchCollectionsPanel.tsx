/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React from 'react'
import type { DispatchCollectionsPanelProps } from '../../../types/messageDispatch.view.types'

export const DispatchCollectionsPanel = React.memo(function DispatchCollectionsPanel({
  labels,
  isBusy,
  isLoading,
  isRefreshing,
  error,
  newCollectionNameRaw,
  collections,
  onRefresh,
  onNewCollectionNameChange,
  onCreateCollection,
  onCollectionToggle,
  onCollectionMenuToggle,
  onCloneCollection,
  onDeleteCollection,
  onEditCollectionContext,
  onRequestSelect,
  onRequestMenuToggle,
  onRequestRenameStart,
  onEditingRequestNameChange,
  onRequestRenameSubmit,
  onRequestRenameCancel,
  onDeleteRequest,
}: DispatchCollectionsPanelProps) {
  return (
    <aside className="dispatch-collections-card">
      <div className="dispatch-collections-head">
        <h3>{labels.title}</h3>
        <button
          type="button"
          className="runs-cta runs-cta-secondary dispatch-tree-refresh-btn"
          onClick={onRefresh}
          disabled={isLoading || isRefreshing}
        >
          {isRefreshing ? labels.refreshing : labels.refresh}
        </button>
      </div>
      <section className="dispatch-collections-create-minimal">
        <div className="dispatch-collections-create-row">
          <input
            aria-label="New collection name"
            className="dispatch-collections-input"
            value={newCollectionNameRaw}
            onChange={(event) => onNewCollectionNameChange(event.target.value)}
            placeholder={labels.newCollectionPlaceholder}
            disabled={isBusy}
          />
          <button
            type="button"
            className="runs-cta runs-cta-primary dispatch-compact-btn dispatch-add-collection-btn"
            onClick={() => void onCreateCollection()}
            disabled={isBusy || newCollectionNameRaw.trim().length === 0}
          >
            {labels.add}
          </button>
        </div>
      </section>

      {error ? <p className="dispatch-error">{error}</p> : null}
      <section className="dispatch-collections-tree">
        {isLoading ? <p className="dispatch-collections-empty">{labels.loadingCollections}</p> : null}
        {!isLoading && collections.length === 0 ? (
          <p className="dispatch-collections-empty">{labels.emptyCollections}</p>
        ) : null}
        {!isLoading && collections.length > 0 ? (
          <div className="dispatch-tree-list">
            {collections.map((collection) => (
              <article
                key={collection.collectionName}
                className={`dispatch-tree-node ${collection.isExpanded ? 'is-expanded' : ''}`}
              >
                <header className="dispatch-tree-collection-row">
                  <button
                    type="button"
                    className="dispatch-tree-toggle"
                    aria-expanded={collection.isExpanded}
                    onClick={() =>
                      onCollectionToggle(collection.collectionName, collection.isExpanded)
                    }
                    disabled={isBusy}
                    title={collection.collectionName}
                  >
                    <span className="dispatch-tree-chevron">
                      {collection.isExpanded ? '▾' : '▸'}
                    </span>
                    <span className="dispatch-tree-name">{collection.collectionName}</span>
                    <span className="dispatch-tree-count">{collection.requestCount}</span>
                  </button>
                  {collection.contextFieldCount > 0 ? (
                    <button
                      type="button"
                      className="dispatch-tree-context-badge"
                      onClick={() => onEditCollectionContext(collection.collectionName)}
                      disabled={isBusy}
                      title={`${labels.contextFieldsTitle}: ${collection.contextFieldCount}`}
                      aria-label={`${labels.contextFieldsTitle}: ${collection.contextFieldCount}`}
                    >
                      <span className="dispatch-tree-context-badge-glyph" aria-hidden="true">
                        {'{ }'}
                      </span>
                      {collection.contextFieldCount}
                    </button>
                  ) : null}
                  <div className="dispatch-tree-menu-wrap">
                    <button
                      type="button"
                      className="runs-cta runs-cta-secondary dispatch-tree-menu-trigger"
                      onClick={() => onCollectionMenuToggle(collection.collectionName)}
                      disabled={isBusy}
                      aria-label={`${labels.actionsFor} ${collection.collectionName}`}
                      aria-expanded={collection.isMenuOpen}
                    >
                      ...
                    </button>
                    {collection.isMenuOpen ? (
                      <div
                        className="dispatch-tree-menu"
                        role="menu"
                        aria-label={`${labels.collectionActions} ${collection.collectionName}`}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          tabIndex={0}
                          className="dispatch-tree-menu-item"
                          onClick={() => void onCloneCollection(collection.collectionName)}
                          disabled={isBusy}
                          autoFocus
                        >
                          {labels.clone}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          tabIndex={0}
                          className="dispatch-tree-menu-item"
                          onClick={() => onEditCollectionContext(collection.collectionName)}
                          disabled={isBusy}
                        >
                          {labels.editContext}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          tabIndex={0}
                          className="dispatch-tree-menu-item is-danger"
                          onClick={() => void onDeleteCollection(collection.collectionName)}
                          disabled={isBusy}
                        >
                          {labels.delete}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </header>

                {collection.isExpanded ? (
                  <div className="dispatch-tree-children">
                    {collection.requests.length === 0 ? (
                      <p className="dispatch-collections-empty">{labels.emptyRequests}</p>
                    ) : (
                      <ul className="dispatch-tree-request-list">
                        {collection.requests.map((request) => (
                          <li
                            key={`${request.collectionName}:${request.singleRequestName}`}
                            className={`dispatch-tree-request-row ${request.isSelected ? 'is-selected' : ''}`}
                          >
                            {request.isEditing ? (
                              <input
                                aria-label="Rename collection"
                                className="dispatch-tree-request-rename"
                                value={request.editingName}
                                onChange={(event) => onEditingRequestNameChange(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault()
                                    void onRequestRenameSubmit()
                                  } else if (event.key === 'Escape') {
                                    event.preventDefault()
                                    onRequestRenameCancel()
                                  }
                                }}
                                onBlur={onRequestRenameCancel}
                                disabled={isBusy}
                                autoFocus
                              />
                            ) : (
                              <button
                                type="button"
                                className="dispatch-tree-request-name"
                                onClick={() =>
                                  void onRequestSelect(
                                    request.singleRequestName,
                                    request.collectionName,
                                  )
                                }
                                onDoubleClick={() =>
                                  onRequestRenameStart(
                                    request.collectionName,
                                    request.singleRequestName,
                                  )
                                }
                                disabled={isBusy}
                                title={request.singleRequestName}
                              >
                                {request.singleRequestName}
                              </button>
                            )}
                            <div className="dispatch-tree-menu-wrap">
                              <button
                                type="button"
                                className="runs-cta runs-cta-secondary dispatch-tree-menu-trigger"
                                onClick={() =>
                                  onRequestMenuToggle(
                                    request.singleRequestName,
                                    request.collectionName,
                                  )
                                }
                                disabled={isBusy || request.isEditing}
                                aria-label={`${labels.actionsFor} ${request.singleRequestName}`}
                                aria-expanded={request.isMenuOpen}
                              >
                                ...
                              </button>
                              {request.isMenuOpen ? (
                                <div
                                  className="dispatch-tree-menu"
                                  role="menu"
                                  aria-label={`${labels.requestActions} ${request.singleRequestName}`}
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    tabIndex={0}
                                    className="dispatch-tree-menu-item"
                                    onClick={() =>
                                      onRequestRenameStart(
                                        request.collectionName,
                                        request.singleRequestName,
                                      )
                                    }
                                    disabled={isBusy}
                                    autoFocus
                                  >
                                    {labels.rename}
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    tabIndex={0}
                                    className="dispatch-tree-menu-item is-danger"
                                    onClick={() =>
                                      void onDeleteRequest(
                                        request.singleRequestName,
                                        request.collectionName,
                                      )
                                    }
                                    disabled={isBusy}
                                  >
                                    {labels.delete}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </aside>
  )
})
