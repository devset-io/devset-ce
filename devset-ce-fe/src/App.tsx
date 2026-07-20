/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useI18n } from './core/i18n/I18nProvider'
import { AppLayout } from './core/layout/AppLayout'
import { MENU_ITEMS } from './core/navigation/menu-items'
import { FlowBuilderManageView, FlowBuilderView } from './features/flow-builder'
import { ModalShell } from './features/flow-builder/components/ModalShell'
import { PlaygroundView } from './features/playground/PlaygroundView'
import { MessageDispatchView } from './features/message-dispatch/MessageDispatchView'
import { SchemaRepoView } from './features/schema-repo'
import { SettingsView } from './features/settings/SettingsView'
import { WorkflowRunsView } from './features/workflow-runs/WorkflowRunsView'
import { KafkaLiveView } from './features/kafka-live/KafkaLiveView'
import type { ViewId } from './shared/types/navigation'

const VIEW_ROUTES: Record<ViewId, string> = {
  'flow-builder': '/flow-builder/manage',
  playground: '/playground',
  'message-dispatch': '/message-dispatch',
  'schema-repo': '/schema-repo',
  runs: '/runs',
  'kafka-live': '/kafka-live',
  settings: '/settings',
}
const FLOW_BUILDER_EDITOR_ROUTE = '/flow-builder/editor'

const PATH_TO_VIEW: Record<string, ViewId> = Object.fromEntries(
  Object.entries(VIEW_ROUTES).map(([viewId, path]) => [path, viewId as ViewId]), // SAFETY: Object.fromEntries loses type info, viewId is constrained by VIEW_ROUTES keys which are ViewId
) as Record<string, ViewId> // SAFETY: Object.fromEntries infers Record<string, unknown>, but values are ViewId by construction
const THEME_STORAGE_KEY = 'devset.theme.mode'
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'devset.layout.sidebar.collapsed'
type ThemeMode = 'light' | 'dark'

const resolveActiveView = (pathname: string): ViewId => {
  if (pathname.startsWith('/flow-builder/')) {
    return 'flow-builder'
  }
  if (pathname.startsWith(`${VIEW_ROUTES.runs}/`)) {
    return 'runs'
  }
  if (pathname.startsWith(`${VIEW_ROUTES['message-dispatch']}/`)) {
    return 'message-dispatch'
  }
  return PATH_TO_VIEW[pathname] ?? 'flow-builder'
}

function App() {
  const { locale, setLocale, t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const activeView = resolveActiveView(location.pathname)
  const [hasUnsavedFlowBuilderChanges, setHasUnsavedFlowBuilderChanges] = useState(false)
  const [pendingViewChange, setPendingViewChange] = useState<ViewId | null>(null)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') {
      return saved
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }
    const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)
    if (saved === 'true' || saved === 'false') {
      return saved === 'true'
    }
    return true
  })

  useEffect(() => {
    const onUnsavedChange = (event: Event) => {
      const customEvent = event as CustomEvent<boolean> // SAFETY: custom event dispatched by flow-builder with a boolean detail
      setHasUnsavedFlowBuilderChanges(Boolean(customEvent.detail))
    }
    window.addEventListener('flow-builder-unsaved-change', onUnsavedChange as EventListener) // SAFETY: DOM addEventListener requires EventListener; onUnsavedChange matches that signature
    return () => {
      window.removeEventListener('flow-builder-unsaved-change', onUnsavedChange as EventListener) // SAFETY: DOM removeEventListener requires EventListener; onUnsavedChange matches that signature
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode)
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
  }, [themeMode])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  const requestViewChange = (view: ViewId) => {
    if (view === activeView) {
      if (view === 'flow-builder' && location.pathname !== VIEW_ROUTES['flow-builder']) {
        if (hasUnsavedFlowBuilderChanges) {
          setPendingViewChange(view)
          return
        }
        navigate(VIEW_ROUTES['flow-builder'])
      }
      return
    }
    if (activeView === 'flow-builder' && hasUnsavedFlowBuilderChanges) {
      setPendingViewChange(view)
      return
    }
    navigate(VIEW_ROUTES[view])
  }

  return (
    <>
      <Toaster richColors position="top-right" closeButton />

      <AppLayout
        items={MENU_ITEMS}
        activeView={activeView}
        onChangeView={requestViewChange}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((current) => !current)}
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode((current) => (current === 'light' ? 'dark' : 'light'))}
        locale={locale}
        onChangeLocale={setLocale}
      >
        <Routes>
          <Route path="/" element={<Navigate to={VIEW_ROUTES['flow-builder']} replace />} />
          <Route path={VIEW_ROUTES['flow-builder']} element={<FlowBuilderManageView />} />
          <Route path={FLOW_BUILDER_EDITOR_ROUTE} element={<FlowBuilderView />} />
          <Route path={VIEW_ROUTES.playground} element={<PlaygroundView />} />
          <Route path={VIEW_ROUTES['message-dispatch']} element={<MessageDispatchView />} />
          <Route path={VIEW_ROUTES['schema-repo']} element={<SchemaRepoView />} />
          <Route path={VIEW_ROUTES['kafka-live']} element={<KafkaLiveView />} />
          <Route path={VIEW_ROUTES.runs} element={<WorkflowRunsView />} />
          <Route path={`${VIEW_ROUTES.runs}/new`} element={<WorkflowRunsView />} />
          <Route path={`${VIEW_ROUTES.runs}/:runId`} element={<WorkflowRunsView />} />
          <Route path={VIEW_ROUTES.settings} element={<SettingsView />} />
          <Route path="*" element={<Navigate to={VIEW_ROUTES['flow-builder']} replace />} />
        </Routes>
      </AppLayout>

      <ModalShell
        isOpen={pendingViewChange !== null}
        title={t('modal.unsaved.title')}
        subtitle={t('modal.unsaved.subtitle')}
        onClose={() => setPendingViewChange(null)}
        zIndexClassName="z-[85]"
        containerClassName="max-w-[540px] gap-3"
      >
        <footer className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            onClick={() => setPendingViewChange(null)}
          >
            {t('modal.unsaved.stay')}
          </button>
          <button
            type="button"
            className="rounded-lg border border-rose-600 bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => {
              if (pendingViewChange) {
                const nextPath = VIEW_ROUTES[pendingViewChange]
                setPendingViewChange(null)
                navigate(nextPath)
              }
            }}
          >
            {t('modal.unsaved.leave')}
          </button>
        </footer>
      </ModalShell>
    </>
  )
}

export default App
