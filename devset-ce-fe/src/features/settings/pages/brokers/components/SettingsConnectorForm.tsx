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
import type { ConnectorType } from '../../../../../shared/services/kafka-connectors.service'
import type { ConnectorDraft, SettingsAction } from '../state/Settings.types'

interface SettingsConnectorFormProps {
  draft: ConnectorDraft
  editingConnectorName: string | null
  draftRequiresAttention: boolean
  isSubmitting: boolean
  canSubmit: boolean
  hasConnectors: boolean
  connectorPendingDelete: { name: string } | null
  onAction: (action: SettingsAction) => void
}

/** Connector configuration form card. */
export const SettingsConnectorForm = React.memo(function SettingsConnectorForm({
  draft,
  editingConnectorName,
  draftRequiresAttention,
  isSubmitting,
  canSubmit,
  hasConnectors,
  connectorPendingDelete,
  onAction,
}: SettingsConnectorFormProps) {
  const { t } = useI18n()

  return (
    <section className="settings-card">
      <h3>{t('settings.view.configTitle')}</h3>
      <div className="settings-security-callout">
        <div className="settings-security-copy">
          <p className="settings-security-badge">{t('settings.security.badge')}</p>
          <p className="settings-security-text">{t('settings.security.summary')}</p>
        </div>
      </div>
      <p className="settings-hint">{t('settings.hintConnector')}</p>
      {hasConnectors ? <p className="settings-hint">{t('settings.hintEditConnector')}</p> : null}
      {editingConnectorName ? (
        <div className="settings-summary settings-summary-editing">
          <strong>{t('settings.editing.badge')}</strong>{' '}
          {t('settings.editing.selected').replace('{name}', editingConnectorName)}
        </div>
      ) : null}
      {draftRequiresAttention ? <p className="settings-warning">{t('settings.editing.reviewWarning')}</p> : null}

      <label className="settings-label">
        {t('settings.view.connectorType')}
        <select
          value={draft.type}
          onChange={(e) => {
            const connectorType: ConnectorType = e.target.value === 'rabbit' ? 'rabbit' : 'kafka'
            onAction({ type: 'connectorTypeChanged', connectorType })
          }}
        >
          <option value="kafka">Kafka</option>
          <option value="rabbit">RabbitMQ</option>
        </select>
      </label>

      <label className="settings-label">
        {t('settings.label.connectorName')}
        <input
          value={draft.name}
          onChange={(e) => onAction({ type: 'draftFieldChanged', field: 'name', value: e.target.value })}
          placeholder="local"
        />
      </label>

      {draft.type === 'kafka' ? (
        <label className="settings-label">
          {t('settings.label.bootstrapServers')}
          <input
            value={draft.bootstrapServers}
            onChange={(e) => onAction({ type: 'draftFieldChanged', field: 'bootstrapServers', value: e.target.value })}
            placeholder="localhost:29092"
          />
        </label>
      ) : (
        <div className="settings-grid">
          <label className="settings-label">
            {t('settings.view.host')}
            <input
              value={draft.host}
              onChange={(e) => onAction({ type: 'draftFieldChanged', field: 'host', value: e.target.value })}
              placeholder="localhost"
            />
          </label>
          <label className="settings-label">
            {t('settings.view.port')}
            <input
              type="number"
              min={1}
              value={draft.port}
              onChange={(e) => onAction({ type: 'draftFieldChanged', field: 'port', value: e.target.value })}
              placeholder="5672"
            />
          </label>
          <label className="settings-label">
            {t('settings.view.virtualHost')}
            <input
              value={draft.virtualHost}
              onChange={(e) => onAction({ type: 'draftFieldChanged', field: 'virtualHost', value: e.target.value })}
              placeholder="/"
            />
          </label>
        </div>
      )}

      <div className="settings-grid">
        <label className="settings-label">
          {t('settings.label.username')}
          <input
            value={draft.username}
            onChange={(e) => onAction({ type: 'draftFieldChanged', field: 'username', value: e.target.value })}
            placeholder="null"
          />
        </label>
        <label className="settings-label">
          {t('settings.label.password')}
          <input
            type="password"
            value={draft.password}
            onChange={(e) => onAction({ type: 'draftFieldChanged', field: 'password', value: e.target.value })}
            placeholder="null"
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
            {t('settings.action.newConnector')}
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
    </section>
  )
})
