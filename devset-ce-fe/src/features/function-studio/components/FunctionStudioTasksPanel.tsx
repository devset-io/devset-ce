/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useCallback } from 'react'
import { useI18n } from '../../../core/i18n/I18nProvider.tsx'
import type { BuilderNode, FnOverrides, LoadedSchema } from '../../flow-builder/types.ts'
import { FunctionBuilder } from './FunctionBuilder.tsx'
import { toStateFormFromMapping } from '../utils/function-studio-draft.ts'
import type { FunctionStudioDrawerApi } from '../hooks/useFunctionStudioDrawerState.ts'
import { buildTabButtonClass, FB_STUDIO, FB_UI } from '../../flow-builder/ui/ui-classes.ts'
import { StateTaskPanel } from './StateTaskPanel.tsx'

type FunctionStudioTasksPanelProps = {
  selectedNode: BuilderNode | null
  selectedSchema: LoadedSchema | undefined
  studioSelectedField: string | null
  setFieldOptions: string[]
  overrides: FnOverrides | undefined
  drawerApi: FunctionStudioDrawerApi
}

export const FunctionStudioTasksPanel = React.memo(function FunctionStudioTasksPanel({
  selectedNode,
  selectedSchema,
  studioSelectedField,
  setFieldOptions,
  overrides,
  drawerApi,
}: FunctionStudioTasksPanelProps) {
  const { t } = useI18n()
  const isProtobufSchema = selectedSchema?.schemaType === 'protobuf'
  const { dispatch } = drawerApi

  const handleTargetStatePathChange = useCallback(
    (value: string) => dispatch({ type: 'stateTaskFormChanged', patch: { targetStatePath: value } }),
    [dispatch],
  )

  return (
    <section className={`${FB_STUDIO.panel} h-full min-h-0 overflow-auto rounded-xl border border-[var(--line-200)] bg-[var(--panel)] p-3`}>
      {isProtobufSchema ? (
        <section className="mb-3 rounded-lg border border-[var(--line-300)] bg-[var(--panel-soft)] p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h4 className="m-0 text-sm font-semibold text-slate-800">{t('flow.wireFormat.title')}</h4>
              <span className="group relative inline-flex">
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-600"
                  aria-label={t('flow.wireFormat.tooltipAria')}
                  tabIndex={0}
                >
                  i
                </span>
                <span className="pointer-events-none absolute left-0 top-5 z-20 hidden w-[320px] rounded-lg border border-slate-200 bg-white p-2 text-[11px] leading-4 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.16)] group-hover:block group-focus-within:block">
                  {t('flow.wireFormat.tooltip')}
                </span>
              </span>
            </div>
          </div>

          <label className={`${FB_UI.label} mb-2 flex items-center gap-2`}>
            <input
              type="checkbox"
              checked={drawerApi.state.wireFormatEnabled}
              onChange={(event) => drawerApi.dispatch({ type: 'wireFormatEnabledChanged', enabled: event.target.checked, currentPrefixValue: drawerApi.state.wireFormatPrefixValue })}
              disabled={!selectedNode}
            />
            <span>{t('flow.wireFormat.enable')}</span>
          </label>

          {drawerApi.state.wireFormatEnabled ? (
            <label className={`${FB_UI.label} mb-2 block`}>
              {t('flow.wireFormat.source')}
              <select
                className={FB_UI.input}
                value="messagePrefix"
                onChange={() => drawerApi.dispatch({ type: 'wireFormatSourceChanged', source: 'messagePrefix', enabled: drawerApi.state.wireFormatEnabled, currentPrefixValue: drawerApi.state.wireFormatPrefixValue })}
                disabled={!selectedNode}
              >
                <option value="messagePrefix">{t('flow.wireFormat.source.messagePrefix')}</option>
              </select>
            </label>
          ) : null}

          {drawerApi.state.wireFormatEnabled ? (
            <label className={`${FB_UI.label} block`}>
              {t('flow.wireFormat.prefixValue')}
              <input
                className={FB_UI.input}
                type="number"
                min={0}
                max={65535}
                step={1}
                value={drawerApi.state.wireFormatPrefixValue}
                onChange={(event) => drawerApi.dispatch({ type: 'wireFormatPrefixValueChanged', value: event.target.value, enabled: drawerApi.state.wireFormatEnabled })}
                disabled={!selectedNode}
                placeholder="0..65535"
              />
              {drawerApi.state.wireFormatPrefixValueError ? (
                <span className="mt-1 block text-xs text-red-700">{t('flow.wireFormat.prefixValueError')}</span>
              ) : null}
            </label>
          ) : null}

          <p className={`${FB_UI.hint} mt-2`}>{t('flow.wireFormat.hint')}</p>
        </section>
      ) : null}
      <h4 className="mb-2 text-sm font-semibold text-slate-800">{t('flow.drawer.tasks')}</h4>
      <div
        className="mb-3 flex gap-1.5"
        role="tablist"
        aria-label={t('flow.drawer.tasks')}
      >
        <button
          type="button"
          role="tab"
          id="task-tab-function"
          aria-selected={drawerApi.state.activeTaskTab === 'function'}
          aria-controls="task-panel-function"
          tabIndex={drawerApi.state.activeTaskTab === 'function' ? 0 : -1}
          className={buildTabButtonClass(drawerApi.state.activeTaskTab === 'function')}
          onClick={() => drawerApi.dispatch({ type: 'setActiveTaskTab', tab: 'function' })}
        >
          {t('flow.drawer.functionTask')}
        </button>
        <button
          type="button"
          role="tab"
          id="task-tab-state"
          aria-selected={drawerApi.state.activeTaskTab === 'state'}
          aria-controls="task-panel-state"
          tabIndex={drawerApi.state.activeTaskTab === 'state' ? 0 : -1}
          className={buildTabButtonClass(drawerApi.state.activeTaskTab === 'state')}
          onClick={() => drawerApi.dispatch({ type: 'setActiveTaskTab', tab: 'state' })}
        >
          {t('flow.drawer.stateTask')}
        </button>
      </div>

      {drawerApi.state.activeTaskTab === 'function' ? (
        <div role="tabpanel" id="task-panel-function" aria-labelledby="task-tab-function">
        <FunctionBuilder
          key={drawerApi.functionBuilderKey}
          availableFields={drawerApi.functionFields}
          onApply={(field, payload) => drawerApi.dispatch({ type: 'queueFunctionApply', field, payload })}
          disabled={!selectedNode}
          selectedField={studioSelectedField ?? setFieldOptions[0]}
          selectedFieldLiteralKindHint={drawerApi.selectedFieldLiteralKindHint}
          selectedFieldExpression={drawerApi.draftSelectedFieldExpression}
          selectedFieldMode={drawerApi.draftSelectedFieldMode}
          selectedFieldValue={drawerApi.draftSelectedFieldValue}
          selectedFieldRawValue={drawerApi.draftSelectedFieldRawValue}
        />
        </div>
      ) : (
        <div role="tabpanel" id="task-panel-state" aria-labelledby="task-tab-state">
        <StateTaskPanel
          selectedNode={!!selectedNode}
          sourceFieldTree={drawerApi.sourceFieldTree}
          selectedStageState={drawerApi.draftSelectedStageState}
          workflowState={drawerApi.workflowState}
          stateSourceField={drawerApi.state.stateTaskForm.sourceField}
          targetStatePath={drawerApi.state.stateTaskForm.targetStatePath}
          stateTaskMode={drawerApi.state.stateTaskForm.mode}
          stateFnExpression={drawerApi.state.stateTaskForm.fnExpression}
          onStateSourceFieldChange={(value) => drawerApi.dispatch({ type: 'stateTaskFormChanged', patch: { sourceField: value } })}
          onTargetStatePathChange={handleTargetStatePathChange}
          onStateTaskModeChange={(mode) => drawerApi.dispatch({ type: 'stateTaskModeChanged', mode, sourceFieldOptions: drawerApi.sourceFieldOptions })}
          onStateFnExpressionChange={(nextExpression) => {
            drawerApi.dispatch({ type: 'stateTaskFormChanged', patch: { fnExpression: nextExpression, isFnDirty: true } })
          }}
          onStateWhenConditionChange={(value) =>
            drawerApi.dispatch({ type: 'stateTaskFormChanged', patch: { whenCondition: value } })
          }
          onStateWhenValueRawChange={(value) =>
            drawerApi.dispatch({ type: 'stateTaskFormChanged', patch: { whenValueRaw: value } })
          }
          onStateWhenHasDefaultChange={(value) =>
            drawerApi.dispatch({ type: 'stateTaskFormChanged', patch: { whenHasDefault: value } })
          }
          onStateWhenDefaultRawChange={(value) =>
            drawerApi.dispatch({ type: 'stateTaskFormChanged', patch: { whenDefaultRaw: value } })
          }
          onApplyStateTask={() =>
            drawerApi.dispatch({
              type: 'queueStateAdd',
              sourceField: drawerApi.state.stateTaskForm.sourceField,
              targetStatePath: drawerApi.state.stateTaskForm.targetStatePath.trim(),
              mode: drawerApi.state.stateTaskForm.mode === 'fn' ? 'fn' : drawerApi.state.stateTaskForm.mode === 'when' ? 'when' : 'ref',
              functionExpression: drawerApi.state.stateTaskForm.fnExpression,
              whenValueRaw: drawerApi.state.stateTaskForm.whenValueRaw,
              whenHasDefault: drawerApi.state.stateTaskForm.whenHasDefault,
              whenDefaultRaw: drawerApi.state.stateTaskForm.whenDefaultRaw,
            })
          }
          onCreateNewStateTask={() => {
            drawerApi.dispatch({ type: 'commitAndResetStateTask' })
          }}
          onSelectStateMapping={(statePath, mapping) => {
            drawerApi.dispatch({ type: 'stateTaskFormChanged', patch: toStateFormFromMapping(statePath, mapping) })
          }}
          onRemoveStateMapping={(statePath) => drawerApi.dispatch({ type: 'queueStateRemove', statePath })}
          stateWhenCondition={drawerApi.state.stateTaskForm.whenCondition}
          stateWhenValueRaw={drawerApi.state.stateTaskForm.whenValueRaw}
          stateWhenHasDefault={drawerApi.state.stateTaskForm.whenHasDefault}
          stateWhenDefaultRaw={drawerApi.state.stateTaskForm.whenDefaultRaw}
        />
        </div>
      )}

      {selectedNode && overrides ? (
        <div className="mt-3 border-t border-[var(--brand-border)] pt-2">
          {Object.entries(overrides)
            .filter(([, override]) => override.mode === 'fn')
            .map(([field, override]) => (
              <p key={field} className="m-0 mb-1 text-xs text-slate-600">
                {field} ({override.mode}): <code>{override.value}</code>
              </p>
            ))}
        </div>
      ) : null}
    </section>
  )
})
