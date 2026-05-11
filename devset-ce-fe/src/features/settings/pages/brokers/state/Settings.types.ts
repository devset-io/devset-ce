/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type {
  ConnectorStatus,
  ConnectorType,
  OpenConnectorConfigurationRequest,
} from '../../../../../shared/services/kafka-connectors.service'

/** Mutable draft shape for connector form editing. */
export type ConnectorDraft = {
  type: ConnectorType
  name: string
  bootstrapServers: string
  host: string
  port: string
  virtualHost: string
  username: string
  password: string
}

/** Returns a default connector name based on the selected type. */
export const getDefaultConnectorName = (type: ConnectorType): string =>
  type === 'rabbit' ? 'local-rabbit' : 'local-kafka'

/** Creates a blank connector draft with default values. */
export const createDefaultDraft = (type: ConnectorType = 'kafka'): ConnectorDraft => ({
  type,
  name: getDefaultConnectorName(type),
  bootstrapServers: 'localhost:29092',
  host: 'localhost',
  port: '5672',
  virtualHost: '/',
  username: '',
  password: '',
})

/** Converts an API connector response into an editable draft. */
export const toConnectorDraft = (configuration: OpenConnectorConfigurationRequest): ConnectorDraft =>
  configuration.type === 'rabbit'
    ? {
        type: 'rabbit',
        name: configuration.name,
        bootstrapServers: 'localhost:29092',
        host: configuration.host,
        port: String(configuration.port),
        virtualHost: configuration.virtualHost,
        username: '',
        password: '',
      }
    : {
        type: 'kafka',
        name: configuration.name,
        bootstrapServers: configuration.bootstrapServers,
        host: 'localhost',
        port: '5672',
        virtualHost: '/',
        username: '',
        password: '',
      }

/** Converts a connector draft into an API request payload. */
export const toConnectorRequest = (draft: ConnectorDraft): OpenConnectorConfigurationRequest =>
  draft.type === 'rabbit'
    ? {
        type: 'rabbit',
        name: draft.name.trim(),
        host: draft.host.trim(),
        port: Number.isFinite(Number(draft.port.trim())) ? Math.floor(Number(draft.port.trim())) : 0,
        virtualHost: draft.virtualHost.trim(),
        username: draft.username.trim() || null,
        password: draft.password.trim() || null,
      }
    : {
        type: 'kafka',
        name: draft.name.trim(),
        bootstrapServers: draft.bootstrapServers.trim(),
        username: draft.username.trim() || null,
        password: draft.password.trim() || null,
      }

/** Full state shape for the settings feature. */
export interface SettingsState {
  draft: ConnectorDraft
  isSubmitting: boolean
  isRefreshing: boolean
  connectors: ConnectorStatus[]
  activeConnectorName: string | null
  connectionsError: string | null
  editingConnectorName: string | null
  draftRequiresAttention: boolean
  draftRequiresCredentials: boolean
  isOverwriteConfirmOpen: boolean
  connectorPendingDelete: ConnectorStatus | null
}

/** Discriminated union of all settings actions. */
export type SettingsAction =
  | { type: 'init' }
  | { type: 'refresh' }
  | { type: 'refreshStart' }
  | { type: 'refreshSuccess'; connectors: ConnectorStatus[]; activeConnectorName: string | null }
  | { type: 'refreshFailed'; error: string }
  | { type: 'activeConnectorChanged'; activeConnectorName: string | null }
  | { type: 'draftFieldChanged'; field: keyof ConnectorDraft; value: string }
  | { type: 'connectorTypeChanged'; connectorType: ConnectorType }
  | { type: 'startNewConnector' }
  | { type: 'editConnector'; connector: ConnectorStatus }
  | {
      type: 'editingLoaded'
      draft: ConnectorDraft
      editingName: string
      requiresAttention: boolean
      requiresCredentials: boolean
    }
  | { type: 'connect' }
  | { type: 'openOverwriteConfirm' }
  | { type: 'closeOverwriteConfirm' }
  | { type: 'confirmOverwrite' }
  | { type: 'submitStart' }
  | { type: 'submitSuccess'; draft: ConnectorDraft; connectorName: string }
  | { type: 'submitFailed' }
  | { type: 'requestDelete'; connector: ConnectorStatus }
  | { type: 'requestDeleteEditing' }
  | { type: 'closeDeleteModal' }
  | { type: 'confirmDelete' }
  | { type: 'deleteSuccess'; deletedName: string; deletedType: ConnectorType; wasEditing: boolean }
  | { type: 'deleteFailed' }
  | { type: 'activateConnector'; name: string }

/** View-ready data derived from settings state. */
export interface SettingsViewData {
  draft: ConnectorDraft
  isSubmitting: boolean
  isRefreshing: boolean
  connectors: ConnectorStatus[]
  activeConnectorName: string | null
  connectionsError: string | null
  editingConnectorName: string | null
  draftRequiresAttention: boolean
  draftRequiresCredentials: boolean
  isOverwriteConfirmOpen: boolean
  connectorPendingDelete: ConnectorStatus | null
  normalizedDraftName: string
  connectorNameExists: boolean
  canSubmit: boolean
  activeConnector: ConnectorStatus | null
}

/** Labels passed to settings effect handlers for user-facing messages. */
export interface SettingsEffectLabels {
  savedToast: string
  deletedToast: string
  editingWarning: string
  errors: {
    loadConnections: string
    connect: string
  }
}
