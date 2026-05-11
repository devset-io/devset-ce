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
import { ModalShell } from '../../../components/ModalShell'
import { JsonCodeEditor } from '../../../components/JsonCodeEditor'
import { FB_UI } from '../../../ui/ui-classes'
import type {
  FlowBuilderStartScreenAction,
  FlowBuilderStartScreenViewData,
} from '../state/FlowBuilderStartScreen.types'

interface FlowBuilderStartScreenViewProps {
  data: FlowBuilderStartScreenViewData
  onAction: (action: FlowBuilderStartScreenAction) => void
}

export const FlowBuilderStartScreenView = React.memo(function FlowBuilderStartScreenView({
  data,
  onAction,
}: FlowBuilderStartScreenViewProps) {
  const {
    labels,
    existingHint,
    workflows,
    isCatalogBusy,
    isImportOpen,
    importRaw,
    importErrorMessage,
    catalogOpenError,
  } = data

  return (
    <>
      <section className="mx-auto mt-4 grid max-w-[1180px] gap-4 lg:grid-cols-3">
        <article className={`${FB_UI.card} flex flex-col gap-2`}>
          <h2 className="m-0 text-base font-semibold text-slate-800">{labels.createNewTitle}</h2>
          <p className={FB_UI.hint}>{labels.createNewHint}</p>
          <button
            type="button"
            className={FB_UI.primaryButton}
            onClick={() => onAction({ type: 'createNew' })}
          >
            {labels.createNewAction}
          </button>
        </article>

        <article className={`${FB_UI.card} flex flex-col gap-2`}>
          <h2 className="m-0 text-base font-semibold text-slate-800">{labels.importTitle}</h2>
          <p className={FB_UI.hint}>{labels.importHint}</p>
          <button
            type="button"
            className={FB_UI.primaryButton}
            onClick={() => onAction({ type: 'openImport' })}
          >
            {labels.importAction}
          </button>
        </article>

        <article className={`${FB_UI.card} flex flex-col gap-2`}>
          <h2 className="m-0 text-base font-semibold text-slate-800">{labels.existingTitle}</h2>
          <p className={FB_UI.hint}>{existingHint}</p>
          <div className="flex max-h-[170px] flex-col gap-1.5 overflow-auto pr-1">
            {workflows.map((workflow) => (
              <button
                key={workflow.id}
                type="button"
                className="rounded-lg border border-[var(--brand-border)] bg-white px-2.5 py-2 text-left text-sm text-slate-700 transition hover:bg-[var(--brand-soft)]"
                onClick={() => onAction({ type: 'openSavedWorkflow', workflowId: workflow.id })}
                disabled={isCatalogBusy}
              >
                <strong className="block text-sm text-slate-800">{workflow.label}</strong>
                {workflow.isBusy ? (
                  <span className="text-xs text-slate-500">{labels.existingOpening}</span>
                ) : workflow.description ? (
                  <span className="text-xs text-slate-500">{workflow.description}</span>
                ) : null}
              </button>
            ))}
          </div>
          {catalogOpenError ? <p className="m-0 text-xs text-red-700">{catalogOpenError}</p> : null}
        </article>
      </section>

      <ModalShell
        isOpen={isImportOpen}
        title={labels.importModalTitle}
        subtitle={labels.importModalSubtitle}
        onClose={() => onAction({ type: 'closeImport' })}
        zIndexClassName="z-[47]"
        containerClassName="max-h-[88vh] max-w-[980px] gap-3"
      >
        <JsonCodeEditor
          value={importRaw}
          onChange={(value) => onAction({ type: 'importRawChanged', value })}
          height="58vh"
        />
        {!importRaw.trim() ? <p className={FB_UI.hint}>{labels.importPlaceholder}</p> : null}
        {importErrorMessage ? <p className="m-0 text-xs text-red-700">{importErrorMessage}</p> : null}
        <footer className="flex items-center justify-end gap-2">
          <button
            type="button"
            className={FB_UI.secondaryButton}
            onClick={() => onAction({ type: 'clearImport' })}
          >
            {labels.clear}
          </button>
          <button
            type="button"
            className={FB_UI.primaryButton}
            onClick={() => onAction({ type: 'applyImport' })}
          >
            {labels.buildFlow}
          </button>
        </footer>
      </ModalShell>
    </>
  )
})
