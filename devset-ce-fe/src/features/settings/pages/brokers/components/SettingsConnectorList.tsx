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
import type { ConnectorStatus } from '../../../../../shared/services/kafka-connectors.service'
import type { SettingsAction } from '../state/Settings.types'

interface SettingsConnectorListProps {
  connectors: ConnectorStatus[]
  activeConnectorName: string | null
  editingConnectorName: string | null
  activeConnector: ConnectorStatus | null
  connectionsError: string | null
  isRefreshing: boolean
  isSubmitting: boolean
  onAction: (action: SettingsAction) => void
}

/** Connected connectors list card. */
export const SettingsConnectorList = React.memo(function SettingsConnectorList({
  connectors,
  activeConnectorName,
  editingConnectorName,
  activeConnector,
  connectionsError,
  isRefreshing,
  isSubmitting,
  onAction,
}: SettingsConnectorListProps) {
  const { t } = useI18n()

  return (
    <section className="settings-card">
      <h3>{t('settings.connected.title')}</h3>
      <p className="settings-hint">{t('settings.connected.hint')}</p>
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
        <p className="settings-empty">{t('settings.empty')}</p>
      ) : (
        <div className="settings-connectors-list">
          {connectors.map((connector) => {
            const isActive = connector.name === activeConnectorName
            const isEditing = connector.name === editingConnectorName
            return (
              <div
                key={connector.name}
                className={`settings-connector-item ${isActive ? 'is-active' : ''} ${isEditing ? 'is-editing' : ''}`}
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
                <input
                  type="radio"
                  name="active-connector"
                  checked={isActive}
                  aria-label={connector.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onAction({ type: 'activateConnector', name: connector.name })}
                />
                <div className="settings-connector-content">
                  <p>
                    <strong>{connector.name}</strong>{' '}
                    {isActive ? <span className="settings-active-pill">{t('settings.active')}</span> : null}
                    {isEditing ? <span className="settings-edit-pill">{t('settings.editing.badge')}</span> : null}
                  </p>
                  <p>
                    {t('settings.view.type')}: {connector.type.toUpperCase()}
                  </p>
                  <p>
                    {t('settings.view.endpoint')}: {connector.endpoint}
                  </p>
                  <p>
                    {t('settings.view.producer')}:{' '}
                    {connector.producerConnected ? t('settings.view.enabled') : t('settings.view.disabled')} |{' '}
                    {t('settings.view.consumer')}:{' '}
                    {connector.consumerConnected ? t('settings.view.enabled') : t('settings.view.disabled')} |{' '}
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

      <div className="settings-summary">
        <strong>{t('settings.status')}</strong>{' '}
        {activeConnector
          ? t('settings.status.connected', { name: activeConnector.name })
          : t('settings.status.disconnected')}
      </div>
    </section>
  )
})
