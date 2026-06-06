/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useRef } from 'react'
import { FunctionStudioDiscardModal } from './FunctionStudioDiscardModal.tsx'
import { FunctionStudioDslPanel } from './FunctionStudioDslPanel.tsx'
import { FunctionStudioHeader } from './FunctionStudioHeader.tsx'
import { SetFieldsSnapshotPanel } from './SetFieldsSnapshotPanel.tsx'
import { FunctionStudioTasksPanel } from './FunctionStudioTasksPanel.tsx'
import type { FunctionStudioDrawerProps } from '../types/function-studio-drawer.types.ts'
import type { PendingOperation } from '../utils/function-studio-draft.ts'
import { buildPillButtonClass, FB_STUDIO } from '../../flow-builder/ui/ui-classes.ts'
import { useFunctionStudioDrawerState } from '../hooks/useFunctionStudioDrawerState.ts'
import { useI18n } from '../../../core/i18n/I18nProvider.tsx'
import { useFocusTrap } from '../../../shared/hooks/useFocusTrap.ts'

export const FunctionStudioDrawer = React.memo(function FunctionStudioDrawer(props: FunctionStudioDrawerProps) {
  const { t } = useI18n()
  const drawerApi = useFunctionStudioDrawerState(props)
  const editorMode = drawerApi.state.editorMode
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, props.isOpen)

  // Keyboard: close on Escape
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      drawerApi.dispatch({ type: 'requestClose' })
    }
  }

  if (!props.isOpen) {
    return null
  }

  return (
    <>
      <div
        ref={dialogRef}
        className="function-studio-drawer fixed inset-0 z-40 flex items-center justify-center bg-[rgba(8,18,12,0.44)] p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="function-studio-dialog-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="relative flex h-[90vh] w-[min(94vw,1500px)] flex-col overflow-hidden rounded-2xl border border-[var(--line-200)] bg-[var(--panel)] shadow-[0_24px_70px_rgba(12,41,25,0.26)] dark:border-[var(--line-200)] dark:bg-[var(--panel)] dark:shadow-[var(--shadow-card)]">
          <FunctionStudioHeader
            selectedNode={props.selectedNode}
            hasPendingChanges={drawerApi.hasPendingChanges}
            isSavingDraft={drawerApi.state.isSavingDraft}
            isSaveBlocked={drawerApi.dslRawHasParseError}
            onReset={() => drawerApi.dispatch({ type: 'resetDraft', selectedEvent: props.selectedEvent, selectedSource: props.selectedSource, wireFormat: props.selectedStageWireFormat })}
            onSave={() => drawerApi.dispatch({ type: 'save' })}
            onClose={() => drawerApi.dispatch({ type: 'requestClose' })}
          />

          <div className={`${FB_STUDIO.body} grid min-h-0 flex-1 grid-cols-[minmax(260px,1fr)_minmax(0,2fr)] gap-3 p-3 max-[1220px]:grid-cols-1`}>
            <section className={`${FB_STUDIO.panel} min-h-0 overflow-auto rounded-xl border border-[var(--line-200)] bg-[var(--panel)] p-3`}>
              <SetFieldsSnapshotPanel
                scopePath={drawerApi.state.scopePath}
                scopeTrail={drawerApi.scopeTrail}
                visibleEntries={drawerApi.snapshotEntries}
                selectedEvent={drawerApi.state.draftSelectedEvent}
                availableEvents={props.availableEvents}
                isSchemaLoading={props.isSchemaLoading}
                isSchemaSelectorDisabled={!props.selectedNode}
                onSchemaChange={(event) => drawerApi.dispatch({ type: 'schemaChangeDraft', event, selectedEvent: props.selectedEvent })}
                inheritedFields={props.inheritedFields}
                setRootFields={drawerApi.draftSetRootFields}
                sourceMode={drawerApi.state.draftSource}
                onSourceModeChange={(source) => drawerApi.dispatch({ type: 'sourceChangeDraft', source })}
                selectedField={
                  editorMode === 'function-studio' && drawerApi.state.activeTaskTab === 'function'
                    ? props.studioSelectedField
                    : null
                }
                onSelectField={(field) => drawerApi.dispatch({ type: 'selectField', field })}
                onScopeChange={(value) => drawerApi.dispatch({ type: 'setScopePath', value })}
              />
            </section>

            <div className="flex min-h-0 flex-col gap-2">
              <div className="inline-flex w-fit gap-1 rounded-full border border-[var(--line-300)] bg-[var(--panel)] p-1" role="group" aria-label={t('flow.drawer.editorMode')}>
                <button
                  type="button"
                  className={buildPillButtonClass(editorMode === 'function-studio')}
                  aria-pressed={editorMode === 'function-studio'}
                  onClick={() => drawerApi.dispatch({ type: 'setEditorMode', mode: 'function-studio' })}
                >
                  {t('flow.drawer.functionTask')}
                </button>
                <button
                  type="button"
                  className={buildPillButtonClass(editorMode === 'raw')}
                  aria-pressed={editorMode === 'raw'}
                  onClick={() => drawerApi.dispatch({ type: 'setEditorMode', mode: 'raw' })}
                >
                  {t('flow.drawer.dslTitle')}
                </button>
              </div>

              <div className="min-h-0 flex-1">
                {editorMode === 'function-studio' ? (
                  <FunctionStudioTasksPanel
                    selectedNode={props.selectedNode}
                    selectedSchema={drawerApi.draftSelectedSchema}
                    studioSelectedField={props.studioSelectedField}
                    setFieldOptions={props.setFieldOptions}
                    overrides={props.overrides}
                    drawerApi={drawerApi}
                  />
                ) : (
                  <FunctionStudioDslPanel
                    selectedStageDsl={drawerApi.draftStageDsl}
                    hasPendingChanges={drawerApi.hasPendingChanges}
                    pendingDslRawFingerprint={computeDslRawFingerprint(drawerApi.state.pendingOps)}
                    pendingDslRawSnapshot={drawerApi.pendingDslRawSnapshot}
                    onDslRawChanged={(setRaw, stateRaw) => drawerApi.dispatch({ type: 'dslRawChanged', setRaw, stateRaw })}
                    onDslRawCleared={() => drawerApi.dispatch({ type: 'dslRawCleared' })}
                    onDslRawErrorChanged={(hasError) => drawerApi.dispatch({ type: 'dslRawErrorChanged', hasError })}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <FunctionStudioDiscardModal
        isOpen={drawerApi.state.showDiscardConfirm}
        onCancel={() => drawerApi.dispatch({ type: 'hideDiscardConfirm' })}
        onDiscard={() => drawerApi.dispatch({ type: 'discardAndClose' })}
      />
    </>
  )
})

// Length proxy over the dispatched dsl-raw op. Changes whenever the debounced
// editor bridge upserts a new setRaw/stateRaw — gives e2e tests a deterministic
// signal to wait for instead of a wall-clock timer.
function computeDslRawFingerprint(pendingOps: readonly PendingOperation[]): number {
  const op = pendingOps.find((o) => o.type === 'dsl-raw')
  if (!op || op.type !== 'dsl-raw') return 0
  return op.setRaw.length + op.stateRaw.length
}
