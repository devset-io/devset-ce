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
import { SchemaRepoGroup } from './SchemaRepoGroup'
import type { SchemaRepoSidebarProps } from '../../../types/schemaRepo.view.types'

export const SchemaRepoSidebar = React.memo(function SchemaRepoSidebar({
  labels,
  groups,
  schemaSearch,
  isLoading,
  isBusy,
  error,
  onStartCreate,
  onSelectSchema,
  onDeleteSchema,
  onToggleGroup,
  onToggleMenu,
  onSchemaSearchChange,
}: SchemaRepoSidebarProps) {
  return (
    <section className="schema-list">
      <div className="schema-list-head">
        <h3>{labels.schemaListTitle}</h3>
        <button type="button" className="runs-cta runs-cta-secondary" onClick={onStartCreate} disabled={isBusy}>
          {labels.newSchema}
        </button>
      </div>
      <label className="schema-search-wrap">
        <input aria-label="Search schemas" value={schemaSearch} onChange={(event) => onSchemaSearchChange(event.target.value)} placeholder={labels.searchPlaceholder} />
      </label>
      {isLoading ? <p>{labels.schemaLoading}</p> : null}
      {error ? <p className="schema-error">{error}</p> : null}
      {!isLoading && !error ? (
        <div className="schema-group-stack">
          {groups.map((group) => (
            <SchemaRepoGroup
              key={group.key}
              labels={labels}
              group={group}
              isBusy={isBusy}
              onSelectSchema={onSelectSchema}
              onDeleteSchema={onDeleteSchema}
              onToggleGroup={onToggleGroup}
              onToggleMenu={onToggleMenu}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
})
