/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { DbConnectorType, DbConnectorStatus } from '../../../../../shared/services/db-connectors.service'

/** Mutable draft shape for db connector form. */
export type DbConnectorDraft = {
  type: DbConnectorType
  name: string
  connectionString: string
  database: string
  username: string
  password: string
}

/** Creates a blank db connector draft. */
export const createDefaultDbDraft = (type: DbConnectorType = 'mongodb'): DbConnectorDraft => ({
  type,
  name: type === 'mongodb' ? 'local-mongo' : 'local-postgres',
  connectionString: type === 'mongodb' ? 'mongodb://localhost:27017' : '',
  database: '',
  username: '',
  password: '',
})

/** Returns default name for the given db type. */
export const getDefaultDbConnectorName = (type: DbConnectorType): string =>
  type === 'mongodb' ? 'local-mongo' : 'local-postgres'

/** Full state shape for the db connectors sub-feature. */
export interface DbConnectorsState {
  draft: DbConnectorDraft
  isSubmitting: boolean
  isRefreshing: boolean
  connectors: DbConnectorStatus[]
  connectionsError: string | null
  editingConnectorName: string | null
  isOverwriteConfirmOpen: boolean
  connectorPendingDelete: DbConnectorStatus | null
}

/** Converts a db connector status into an editable draft. */
export const toDbConnectorDraft = (connector: DbConnectorStatus): DbConnectorDraft => ({
  type: connector.type,
  name: connector.name,
  connectionString: connector.connectionString,
  database: connector.database,
  username: '',
  password: '',
})

/** Discriminated union of all db connector actions. */
export type DbConnectorsAction =
  | { type: 'init' }
  | { type: 'refresh' }
  | { type: 'refreshStart' }
  | { type: 'refreshSuccess'; connectors: DbConnectorStatus[] }
  | { type: 'refreshFailed'; error: string }
  | { type: 'draftFieldChanged'; field: keyof DbConnectorDraft; value: string }
  | { type: 'dbTypeChanged'; dbType: DbConnectorType }
  | { type: 'startNewConnector' }
  | { type: 'editConnector'; connector: DbConnectorStatus }
  | { type: 'editingLoaded'; draft: DbConnectorDraft; editingName: string }
  | { type: 'connect' }
  | { type: 'openOverwriteConfirm' }
  | { type: 'closeOverwriteConfirm' }
  | { type: 'confirmOverwrite' }
  | { type: 'submitStart' }
  | { type: 'submitSuccess'; connectorName: string }
  | { type: 'submitFailed' }
  | { type: 'requestDelete'; connector: DbConnectorStatus }
  | { type: 'requestDeleteEditing' }
  | { type: 'closeDeleteModal' }
  | { type: 'confirmDelete' }
  | { type: 'deleteSuccess'; deletedName: string; deletedType: DbConnectorType }
  | { type: 'deleteFailed' }

/** View-ready data derived from db connectors state. */
export interface DbConnectorsViewData {
  draft: DbConnectorDraft
  isSubmitting: boolean
  isRefreshing: boolean
  connectors: DbConnectorStatus[]
  connectionsError: string | null
  editingConnectorName: string | null
  isOverwriteConfirmOpen: boolean
  connectorPendingDelete: DbConnectorStatus | null
  normalizedDraftName: string
  connectorNameExists: boolean
  canSubmit: boolean
}

/** Labels passed to db connector effect handlers. */
export interface DbConnectorsEffectLabels {
  savedToast: string
  deletedToast: string
  errors: {
    loadConnections: string
    connect: string
    delete: string
  }
}
