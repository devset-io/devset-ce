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
// REASON: SettingsBrokersTab is a page-level component encapsulating the brokers subdomain with its own reducer/effects lifecycle.
import { useSettings } from './hooks/Settings.hooks'
import { SettingsConnectorForm } from './components/SettingsConnectorForm'
import { SettingsConnectorList } from './components/SettingsConnectorList'
import { SettingsOverwriteModal } from './components/SettingsOverwriteModal'
import { SettingsDeleteModal } from './components/SettingsDeleteModal'

/** Brokers tab — owns its hook lifecycle so init/SSE only run while mounted. */
export const SettingsBrokersTab = React.memo(function SettingsBrokersTab() {
  const { viewData, dispatch } = useSettings()

  return (
    <>
      <div className="settings-layout">
        <SettingsConnectorForm
          draft={viewData.draft}
          editingConnectorName={viewData.editingConnectorName}
          draftRequiresAttention={viewData.draftRequiresAttention}
          isSubmitting={viewData.isSubmitting}
          canSubmit={viewData.canSubmit}
          hasConnectors={viewData.connectors.length > 0}
          connectorPendingDelete={viewData.connectorPendingDelete}
          onAction={dispatch}
        />
        <SettingsConnectorList
          connectors={viewData.connectors}
          activeConnectorName={viewData.activeConnectorName}
          editingConnectorName={viewData.editingConnectorName}
          activeConnector={viewData.activeConnector}
          connectionsError={viewData.connectionsError}
          isRefreshing={viewData.isRefreshing}
          isSubmitting={viewData.isSubmitting}
          onAction={dispatch}
        />
      </div>

      <SettingsOverwriteModal
        isOpen={viewData.isOverwriteConfirmOpen}
        normalizedDraftName={viewData.normalizedDraftName}
        isSubmitting={viewData.isSubmitting}
        onAction={dispatch}
      />
      <SettingsDeleteModal
        connectorPendingDelete={viewData.connectorPendingDelete}
        isSubmitting={viewData.isSubmitting}
        onAction={dispatch}
      />
    </>
  )
})
