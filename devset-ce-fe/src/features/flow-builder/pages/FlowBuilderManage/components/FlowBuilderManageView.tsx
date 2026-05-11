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
import { JsonCodeEditor } from '../../../components/JsonCodeEditor'
import { ModalShell } from '../../../components/ModalShell'
import { FB_UI } from '../../../ui/ui-classes'
import type {
  FlowBuilderManageAction,
  FlowBuilderManageViewData,
} from '../state/FlowBuilderManage.types'

interface FlowBuilderManageViewProps {
  data: FlowBuilderManageViewData
  onAction: (action: FlowBuilderManageAction) => void
}

export const FlowBuilderManageView = React.memo(function FlowBuilderManageView({
  data,
  onAction,
}: FlowBuilderManageViewProps) {
  const {
    labels,
    summary,
    workflows,
    hasWorkflows,
    emptyStateText,
    isImportOpen,
    importRaw,
    importErrorMessage,
  } = data

  return (
    <section className="mx-auto flex w-full max-w-[1220px] flex-col gap-4">
      <article className="rounded-xl border border-[var(--line-200)] bg-[var(--panel)] p-4 shadow-[0_6px_18px_rgba(40,61,95,0.08)]">
        <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="m-0 text-lg font-semibold text-[var(--ink-900)]">{labels.title}</h3>
            <p className="mt-1 text-sm text-[var(--ink-700)]">{labels.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="runs-cta runs-cta-secondary"
              onClick={() => onAction({ type: 'openImport' })}
            >
              {labels.import}
            </button>
            <button
              type="button"
              className="runs-cta runs-cta-primary"
              onClick={() => onAction({ type: 'createNew' })}
            >
              {labels.create}
            </button>
          </div>
        </header>

        <p className="m-0 text-sm text-[var(--ink-700)]">{summary}</p>
      </article>

      <article className="overflow-hidden rounded-xl border border-[var(--line-200)] bg-[var(--panel)] shadow-[0_6px_18px_rgba(40,61,95,0.08)]">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{labels.tableCaption}</caption>
          <thead>
            <tr className="border-b border-[var(--line-200)] bg-[var(--panel-soft)]">
              <th scope="col" className="px-4 py-3 font-semibold text-[var(--ink-700)]">{labels.tableId}</th>
              <th scope="col" className="px-4 py-3 font-semibold text-[var(--ink-700)]">{labels.tableLabel}</th>
              <th scope="col" className="px-4 py-3 font-semibold text-[var(--ink-700)]">{labels.tableActions}</th>
            </tr>
          </thead>
          <tbody>
            {!hasWorkflows ? (
              <tr>
                <td className="px-4 py-4 text-[var(--ink-700)]" colSpan={3}>
                  {emptyStateText}
                </td>
              </tr>
            ) : (
              workflows.map((workflow) => (
                <tr key={workflow.id} className="border-b border-[var(--line-200)] last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--ink-900)]">{workflow.id}</td>
                  <td className="px-4 py-3 text-[var(--ink-900)]">{workflow.label}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="runs-cta runs-cta-secondary"
                        disabled={workflow.isBusy}
                        onClick={() => onAction({ type: 'openWorkflow', workflowId: workflow.id })}
                      >
                        {labels.open}
                      </button>
                      <button
                        type="button"
                        className="runs-cta runs-cta-secondary"
                        disabled={workflow.isBusy}
                        onClick={() => onAction({ type: 'cloneWorkflow', workflowId: workflow.id })}
                      >
                        {labels.clone}
                      </button>
                      <button
                        type="button"
                        className="runs-cta runs-cta-secondary"
                        disabled={workflow.isBusy}
                        onClick={() => onAction({ type: 'deleteWorkflow', workflowId: workflow.id })}
                      >
                        {labels.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </article>

      <ModalShell
        isOpen={isImportOpen}
        title={labels.importModalTitle}
        subtitle={labels.importModalSubtitle}
        onClose={() => onAction({ type: 'closeImport' })}
        zIndexClassName="z-[70]"
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
    </section>
  )
})
