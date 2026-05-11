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
import type { DbConnectorType } from '../../../../../shared/services/db-connectors.service'
import type { DbConnectorDraft, DbConnectorsAction } from '../state/DbConnectors.types'

interface DbConnectorFormProps {
  draft: DbConnectorDraft
  editingConnectorName: string | null
  isSubmitting: boolean
  canSubmit: boolean
  hasConnectors: boolean
  connectorPendingDelete: { name: string } | null
  onAction: (action: DbConnectorsAction) => void
}

/** Database connector configuration form. */
export const DbConnectorForm = React.memo(function DbConnectorForm({
  draft,
  editingConnectorName,
  isSubmitting,
  canSubmit,
  hasConnectors,
  connectorPendingDelete,
  onAction,
}: DbConnectorFormProps) {
  const { t } = useI18n()
  const isPostgres = draft.type === 'postgres'

  return (
    <section className="settings-card">
      <h3>{t('dbConnectors.configTitle')}</h3>
      <div className="settings-security-callout">
        <div className="settings-security-copy">
          <p className="settings-security-badge">{t('settings.security.badge')}</p>
          <p className="settings-security-text">{t('settings.security.summary')}</p>
        </div>
      </div>
      <p className="settings-hint">{t('dbConnectors.hint')}</p>
      {hasConnectors ? <p className="settings-hint">{t('dbConnectors.hintEdit')}</p> : null}
      {editingConnectorName ? (
        <div className="settings-summary settings-summary-editing">
          <strong>{t('settings.editing.badge')}</strong>{' '}
          {t('dbConnectors.editing.selected').replace('{name}', editingConnectorName)}
        </div>
      ) : null}

      <label className="settings-label">
        {t('dbConnectors.label.dbType')}
        <select
          value={draft.type}
          onChange={(e) => {
            const dbType: DbConnectorType = e.target.value === 'postgres' ? 'postgres' : 'mongodb'
            onAction({ type: 'dbTypeChanged', dbType })
          }}
        >
          <option value="mongodb">MongoDB</option>
          <option value="postgres">PostgreSQL (coming soon)</option>
        </select>
      </label>

      {isPostgres ? (
        <div className="settings-db-coming-soon">
          <p>{t('dbConnectors.comingSoon')}</p>
        </div>
      ) : (
        <>
          <label className="settings-label">
            {t('dbConnectors.label.name')}
            <input
              value={draft.name}
              onChange={(e) => onAction({ type: 'draftFieldChanged', field: 'name', value: e.target.value })}
              placeholder="local-mongo"
            />
          </label>

          <label className="settings-label">
            {t('dbConnectors.label.connectionString')}
            <input
              value={draft.connectionString}
              onChange={(e) =>
                onAction({ type: 'draftFieldChanged', field: 'connectionString', value: e.target.value })
              }
              placeholder="mongodb://localhost:27017"
            />
          </label>

          <label className="settings-label">
            {t('dbConnectors.label.database')}
            <input
              value={draft.database}
              onChange={(e) => onAction({ type: 'draftFieldChanged', field: 'database', value: e.target.value })}
              placeholder="mydb"
            />
          </label>

          <div className="settings-grid">
            <label className="settings-label">
              {t('settings.label.username')}
              <input
                value={draft.username}
                onChange={(e) => onAction({ type: 'draftFieldChanged', field: 'username', value: e.target.value })}
                placeholder={t('dbConnectors.placeholder.optional')}
              />
            </label>
            <label className="settings-label">
              {t('settings.label.password')}
              <input
                type="password"
                value={draft.password}
                onChange={(e) => onAction({ type: 'draftFieldChanged', field: 'password', value: e.target.value })}
                placeholder={t('dbConnectors.placeholder.optional')}
              />
            </label>
          </div>

          <div className="settings-form-actions">
            <button
              type="button"
              className="runs-cta runs-cta-primary"
              onClick={() => onAction({ type: 'connect' })}
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting
                ? editingConnectorName
                  ? t('settings.action.savingChanges')
                  : t('settings.action.connecting')
                : editingConnectorName
                  ? t('settings.action.saveChanges')
                  : t('settings.action.connect')}
            </button>
            {editingConnectorName ? (
              <button
                type="button"
                className="runs-cta runs-cta-secondary"
                onClick={() => onAction({ type: 'startNewConnector' })}
                disabled={isSubmitting}
              >
                {t('dbConnectors.action.newConnection')}
              </button>
            ) : null}
            {editingConnectorName ? (
              <button
                type="button"
                className="settings-danger-button"
                onClick={() => onAction({ type: 'requestDeleteEditing' })}
                disabled={isSubmitting}
              >
                {isSubmitting && connectorPendingDelete?.name === editingConnectorName
                  ? t('settings.action.deleting')
                  : t('settings.action.delete')}
              </button>
            ) : null}
          </div>
        </>
      )}
    </section>
  )
})
