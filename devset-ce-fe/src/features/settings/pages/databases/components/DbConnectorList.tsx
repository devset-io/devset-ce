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
import { useI18n } from '../../../../../core/i18n/I18nProvider'
import type { DbConnectorStatus } from '../../../../../shared/services/db-connectors.service'
import type { DbConnectorsAction } from '../state/DbConnectors.types'

/** Masks credentials in a connection string URI (e.g. mongodb://user:pass@host → mongodb://user:••••@host). */
function maskConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString)
    if (url.password) {
      url.password = '••••'
    }
    return url.toString()
  } catch {
    // Not a parseable URL — mask anything that looks like ://user:pass@
    return connectionString.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:••••@')
  }
}

interface DbConnectorListProps {
  connectors: DbConnectorStatus[]
  editingConnectorName: string | null
  connectionsError: string | null
  isRefreshing: boolean
  isSubmitting: boolean
  onAction: (action: DbConnectorsAction) => void
}

/** Database connectors list card. */
export const DbConnectorList = React.memo(function DbConnectorList({
  connectors,
  editingConnectorName,
  connectionsError,
  isRefreshing,
  isSubmitting,
  onAction,
}: DbConnectorListProps) {
  const { t } = useI18n()

  return (
    <section className="settings-card">
      <h3>{t('dbConnectors.list.title')}</h3>
      <p className="settings-hint">{t('dbConnectors.list.hint')}</p>
      {connectionsError ? <p className="settings-error">{connectionsError}</p> : null}
      <div className="settings-actions">
        <button
          type="button"
          className="runs-cta runs-cta-secondary"
          onClick={() => onAction({ type: 'refresh' })}
          disabled={isRefreshing}
        >
          {isRefreshing ? t('settings.action.refreshing') : t('settings.action.refresh')}
        </button>
      </div>

      {connectors.length === 0 ? (
        <p className="settings-empty">{t('dbConnectors.empty')}</p>
      ) : (
        <div className="settings-connectors-list">
          {connectors.map((connector) => {
            const isEditing = connector.name === editingConnectorName
            return (
              <div
                key={`${connector.type}-${connector.name}`}
                className={`settings-connector-item ${isEditing ? 'is-editing' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={connector.name}
                onClick={() => onAction({ type: 'editConnector', connector })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onAction({ type: 'editConnector', connector })
                  }
                }}
              >
                <div className="settings-db-icon">
                  {connector.type === 'mongodb' ? 'M' : 'P'}
                </div>
                <div className="settings-connector-content">
                  <p>
                    <strong>{connector.name}</strong>{' '}
                    {isEditing ? <span className="settings-edit-pill">{t('settings.editing.badge')}</span> : null}
                  </p>
                  <p>
                    {t('settings.view.type')}: {connector.type === 'mongodb' ? 'MongoDB' : 'PostgreSQL'}
                  </p>
                  <p className="settings-db-connection-string">
                    {t('dbConnectors.label.connectionString')}: {maskConnectionString(connector.connectionString)}
                  </p>
                  <p>
                    {t('dbConnectors.view.connected')}:{' '}
                    {connector.connected ? t('settings.view.enabled') : t('settings.view.disabled')} |{' '}
                    {t('settings.view.auth')}:{' '}
                    {connector.authenticated ? t('settings.view.enabled') : t('settings.view.disabled')}
                  </p>
                </div>
                <button
                  type="button"
                  className="settings-danger-button settings-inline-danger-button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAction({ type: 'requestDelete', connector })
                  }}
                  disabled={isSubmitting}
                >
                  {t('settings.action.delete')}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
})
