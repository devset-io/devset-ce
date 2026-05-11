/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { ReactNode } from 'react'
import { useI18n, type Locale } from '../i18n/I18nProvider'
import type { MenuItem, ViewId } from '../../shared/types/navigation'

type AppLayoutProps = {
  items: MenuItem[]
  activeView: ViewId
  onChangeView: (view: ViewId) => void
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  themeMode: 'light' | 'dark'
  onToggleTheme: () => void
  locale: Locale
  onChangeLocale: (locale: Locale) => void
  children: ReactNode
}

const MENU_ICON_BY_VIEW: Record<ViewId, ReactNode> = {
  'flow-builder': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5h4v4H6V5zm8 0h4v4h-4V5zM6 15h4v4H6v-4zm8 0h4v4h-4v-4zM10 7h4m-8 10h8m4-8v6" />
    </svg>
  ),
  playground: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4h8m-7 4v3.5L5.4 18a1.2 1.2 0 0 0 1.04 1.8h11.12A1.2 1.2 0 0 0 18.6 18L15 11.5V8M9 8h6M9.5 14h5" />
    </svg>
  ),
  'message-dispatch': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 12h11m0 0-3.5-3.5M15.5 12l-3.5 3.5M5 5.75h14a1.25 1.25 0 0 1 1.25 1.25v10A1.25 1.25 0 0 1 19 18.25H5A1.25 1.25 0 0 1 3.75 17V7A1.25 1.25 0 0 1 5 5.75z" />
    </svg>
  ),
  'schema-repo': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6.5C4 5.67 7.58 5 12 5s8 .67 8 1.5S16.42 8 12 8 4 7.33 4 6.5zM4 12c0 .83 3.58 1.5 8 1.5s8-.67 8-1.5M4 17.5c0 .83 3.58 1.5 8 1.5s8-.67 8-1.5M4 6.5v11M20 6.5v11" />
    </svg>
  ),
  runs: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19h14M7 16V9M12 16V5M17 16v-4" />
    </svg>
  ),
  'kafka-live': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16v4H4zm0 6h16v4H4z" />
    </svg>
  ),
  docs: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.75h9.25A1.75 1.75 0 0 1 18 6.5v11.75a1 1 0 0 1-1.58.81L13 16.5l-3.42 2.56A1 1 0 0 1 8 18.25V6.5A1.75 1.75 0 0 1 9.75 4.75zM10.5 8.5h5M10.5 11.5h5" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.75A3.25 3.25 0 1 0 12 15.25 3.25 3.25 0 1 0 12 8.75zM4.75 13.25v-2.5l2.2-.5c.13-.45.31-.88.54-1.28L6.2 7.05l1.77-1.77 1.92 1.3c.4-.23.83-.41 1.28-.54l.5-2.2h2.5l.5 2.2c.45.13.88.31 1.28.54l1.92-1.3 1.77 1.77-1.3 1.92c.23.4.41.83.54 1.28l2.2.5v2.5l-2.2.5c-.13.45-.31.88-.54 1.28l1.3 1.92-1.77 1.77-1.92-1.3c-.4.23-.83.41-1.28.54l-.5 2.2h-2.5l-.5-2.2a6.8 6.8 0 0 1-1.28-.54l-1.92 1.3-1.77-1.77 1.3-1.92a6.8 6.8 0 0 1-.54-1.28l-2.2-.5z" />
    </svg>
  ),
}

export function AppLayout({
  items,
  activeView,
  onChangeView,
  isSidebarCollapsed,
  onToggleSidebar,
  themeMode,
  onToggleTheme,
  locale,
  onChangeLocale,
  children,
}: AppLayoutProps) {
  const { t } = useI18n()
  const activeItem = items.find((item) => item.id === activeView) ?? items[0]
  const activeFeatureLabel = t(`menu.${activeItem.id}.label`)
  const activeFeatureDescription = t(`menu.${activeItem.id}.description`)
  const brandLogoSrc = isSidebarCollapsed ? '/logo_down.svg' : '/logo.svg'
  const uiVersion = import.meta.env.VITE_UI_VERSION ?? '0.1.0'
  const apiVersion = import.meta.env.VITE_API_VERSION ?? '0.1.0'

  return (
    <div className={`app-shell min-h-full ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand" aria-label="Devset CE">
            <span className="brand-mark">
              <img className="brand-logo" src={brandLogoSrc} alt="" />
            </span>
          </div>

          <button
            type="button"
            className="sidebar-toggle"
            onClick={onToggleSidebar}
            aria-label={isSidebarCollapsed ? t('layout.sidebarExpand') : t('layout.sidebarCollapse')}
            aria-pressed={isSidebarCollapsed}
            title={isSidebarCollapsed ? t('layout.sidebarExpand') : t('layout.sidebarCollapse')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {isSidebarCollapsed ? <path d="m9 6 6 6-6 6" /> : <path d="m15 6-6 6 6 6" />}
            </svg>
          </button>
        </div>

        <nav className="menu" aria-label={t('layout.mainMenu')}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`menu-item ${item.id === 'docs' ? 'menu-item-group-start' : ''} ${item.id === activeView ? 'active' : ''}`}
              onClick={() => onChangeView(item.id)}
              aria-label={t(`menu.${item.id}.label`)}
              title={t(`menu.${item.id}.label`)}
            >
              <span className="menu-item-icon">{MENU_ICON_BY_VIEW[item.id]}</span>
              <span className="menu-item-label">{t(`menu.${item.id}.label`)}</span>
            </button>
          ))}
        </nav>

        <footer className="sidebar-feature" aria-label="Version info">
          <p className="sidebar-feature-eyebrow">Versions</p>
          <p className="sidebar-feature-version">
            <span>UI</span>
            <strong>{uiVersion}</strong>
          </p>
          <p className="sidebar-feature-version">
            <span>API</span>
            <strong>{apiVersion}</strong>
          </p>
        </footer>
      </aside>

      <main className="content">
        <h1 className="sr-only">Devset CE</h1>
        <header className="content-header">
          <div>
            <h2>{activeFeatureLabel}</h2>
            <p>{activeFeatureDescription}</p>
          </div>
          <div className="header-actions">
            <label className="language-toggle">
              <span className="sr-only">{t('layout.languageToggle')}</span>
              <select
                className="language-select"
                aria-label={t('layout.languageToggle')}
                value={locale}
                onChange={(event) => {
                  const value = event.target.value
                  if (value !== 'en' && value !== 'pl') return
                  onChangeLocale(value)
                }}
              >
                <option value="en">English</option>
                <option value="pl">Polski</option>
              </select>
            </label>
            <button type="button" className="theme-toggle" onClick={onToggleTheme}>
              {themeMode === 'dark' ? t('layout.theme.light') : t('layout.theme.dark')}
            </button>
          </div>
        </header>

        <section className="content-body">{children}</section>
      </main>
    </div>
  )
}
