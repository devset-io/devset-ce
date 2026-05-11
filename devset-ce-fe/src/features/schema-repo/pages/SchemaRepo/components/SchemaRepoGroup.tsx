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
import type { SchemaRepoGroupProps } from '../../../types/schemaRepo.view.types'

export const SchemaRepoGroup = React.memo(function SchemaRepoGroup({
  labels,
  group,
  isBusy,
  onSelectSchema,
  onDeleteSchema,
  onToggleGroup,
  onToggleMenu,
}: SchemaRepoGroupProps) {
  return (
    <article className={`schema-group schema-tree-group ${group.isExpanded ? 'is-expanded' : ''}`}>
      <header className="schema-tree-group-row">
        <button type="button" className="schema-tree-group-toggle" aria-expanded={group.isExpanded} onClick={() => onToggleGroup(group.key)}>
          <span className="schema-tree-chevron">{group.isExpanded ? '▾' : '▸'}</span>
          <span className="schema-tree-group-name">{group.title}</span>
          <span className="schema-tree-group-count">{group.items.length}</span>
        </button>
      </header>

      {group.isExpanded ? (
        <div className="schema-tree-children">
          {group.items.length === 0 ? (
            <p className="schema-tree-empty">{labels.groupEmpty}</p>
          ) : (
            <div className="schema-tree-list">
              {group.items.map((item) => (
                <article key={item.id} className={`schema-tree-node ${item.isSelected ? 'is-selected' : ''}`}>
                  <button
                    type="button"
                    className="schema-tree-toggle"
                    onClick={() => onSelectSchema(item.id)}
                    disabled={isBusy}
                    title={item.id}
                  >
                    <span className="schema-tree-name">{item.id}</span>
                    <span className="schema-tree-version">v{item.version}</span>
                  </button>
                  <div className="schema-tree-menu-wrap">
                    <button
                      type="button"
                      className="runs-cta runs-cta-secondary schema-tree-menu-trigger"
                      onClick={() => onToggleMenu(item.menuKey)}
                      disabled={isBusy}
                      aria-label={`${labels.actionsFor} ${item.id}`}
                      aria-expanded={item.isMenuOpen}
                    >
                      ...
                    </button>
                    {item.isMenuOpen ? (
                      <div
                        className="schema-tree-menu"
                        role="menu"
                        aria-label={`${labels.schemaActions} ${item.id}`}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          tabIndex={0}
                          className="schema-tree-menu-item is-danger"
                          onClick={() => onDeleteSchema(item.id)}
                          disabled={isBusy}
                          autoFocus
                        >
                          {item.isDeleting ? labels.deleting : labels.delete}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </article>
  )
})
