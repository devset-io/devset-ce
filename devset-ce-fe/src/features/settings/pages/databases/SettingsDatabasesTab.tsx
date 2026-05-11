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
// REASON: SettingsDatabasesTab is a page-level component encapsulating the databases subdomain with its own reducer/effects lifecycle.
import { useDbConnectors } from './hooks/DbConnectors.hooks'
import { DbConnectorForm } from './components/DbConnectorForm'
import { DbConnectorList } from './components/DbConnectorList'
import { DbConnectorOverwriteModal } from './components/DbConnectorOverwriteModal'
import { DbConnectorDeleteModal } from './components/DbConnectorDeleteModal'

/** Databases tab — owns its hook lifecycle so init only runs while mounted. */
export const SettingsDatabasesTab = React.memo(function SettingsDatabasesTab() {
  const { viewData, dispatch } = useDbConnectors()

  return (
    <>
      <div className="settings-layout">
        <DbConnectorForm
          draft={viewData.draft}
          editingConnectorName={viewData.editingConnectorName}
          isSubmitting={viewData.isSubmitting}
          canSubmit={viewData.canSubmit}
          hasConnectors={viewData.connectors.length > 0}
          connectorPendingDelete={viewData.connectorPendingDelete}
          onAction={dispatch}
        />
        <DbConnectorList
          connectors={viewData.connectors}
          editingConnectorName={viewData.editingConnectorName}
          connectionsError={viewData.connectionsError}
          isRefreshing={viewData.isRefreshing}
          isSubmitting={viewData.isSubmitting}
          onAction={dispatch}
        />
      </div>

      <DbConnectorOverwriteModal
        isOpen={viewData.isOverwriteConfirmOpen}
        normalizedDraftName={viewData.normalizedDraftName}
        isSubmitting={viewData.isSubmitting}
        onAction={dispatch}
      />
      <DbConnectorDeleteModal
        connectorPendingDelete={viewData.connectorPendingDelete}
        isSubmitting={viewData.isSubmitting}
        onAction={dispatch}
      />
    </>
  )
})
