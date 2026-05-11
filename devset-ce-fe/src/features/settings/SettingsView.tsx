/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useCallback, useState } from 'react'
import { useI18n } from '../../core/i18n/I18nProvider'
import { SettingsBrokersTab } from './pages/brokers/SettingsBrokersTab'
import { SettingsDatabasesTab } from './pages/databases/SettingsDatabasesTab'

type SettingsTab = 'brokers' | 'databases'

const TAB_IDS = {
  brokers: { tab: 'settings-tab-brokers', panel: 'settings-panel-brokers' },
  databases: { tab: 'settings-tab-databases', panel: 'settings-panel-databases' },
} as const

export function SettingsView() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<SettingsTab>('brokers')

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setActiveTab((prev) => (prev === 'brokers' ? 'databases' : 'brokers'))
      }
    },
    [],
  )

  return (
    <div className="settings-page">
      <div className="settings-tabs" role="tablist" aria-label={t('settings.tabs.aria')}>
        <button
          type="button"
          role="tab"
          id={TAB_IDS.brokers.tab}
          aria-selected={activeTab === 'brokers'}
          aria-controls={TAB_IDS.brokers.panel}
          tabIndex={activeTab === 'brokers' ? 0 : -1}
          className={`settings-tab ${activeTab === 'brokers' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('brokers')}
          onKeyDown={handleTabKeyDown}
        >
          {t('settings.section.brokers')}
        </button>
        <button
          type="button"
          role="tab"
          id={TAB_IDS.databases.tab}
          aria-selected={activeTab === 'databases'}
          aria-controls={TAB_IDS.databases.panel}
          tabIndex={activeTab === 'databases' ? 0 : -1}
          className={`settings-tab ${activeTab === 'databases' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('databases')}
          onKeyDown={handleTabKeyDown}
        >
          {t('settings.section.databases')}
        </button>
      </div>

      <div
        role="tabpanel"
        id={TAB_IDS[activeTab].panel}
        aria-labelledby={TAB_IDS[activeTab].tab}
      >
        {activeTab === 'brokers' ? <SettingsBrokersTab /> : <SettingsDatabasesTab />}
      </div>
    </div>
  )
}
