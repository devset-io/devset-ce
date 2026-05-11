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
import { useI18n } from '../../../core/i18n/I18nProvider.tsx'
import type { SchemaFieldNode } from '../../flow-builder/utils/schema-extraction.utils.ts'
import { FunctionExpressionBuilder } from '../../flow-builder/components/FunctionExpressionBuilder.tsx'
import { FieldTreePicker } from './FieldTreePicker.tsx'
import { FB_UI } from '../../flow-builder/ui/ui-classes.ts'

type StateTaskPanelProps = {
  selectedNode: boolean
  sourceFieldTree: SchemaFieldNode[]
  selectedStageState: Record<string, unknown>
  stateSourceField: string
  targetStatePath: string
  stateTaskMode: 'assign' | 'fn' | 'when'
  stateFnExpression: string
  stateWhenCondition: string
  stateWhenValueRaw: string
  stateWhenHasDefault: boolean
  stateWhenDefaultRaw: string
  onStateSourceFieldChange: (value: string) => void
  onTargetStatePathChange: (value: string) => void
  onStateTaskModeChange: (value: 'assign' | 'fn' | 'when') => void
  onStateFnExpressionChange: (value: string) => void
  onStateWhenConditionChange: (value: string) => void
  onStateWhenValueRawChange: (value: string) => void
  onStateWhenHasDefaultChange: (value: boolean) => void
  onStateWhenDefaultRawChange: (value: string) => void
  onApplyStateTask: () => void
  onCreateNewStateTask: () => void
  onSelectStateMapping: (statePath: string, mapping: unknown) => void
  onRemoveStateMapping: (statePath: string) => void
}

export const StateTaskPanel = React.memo(function StateTaskPanel({
  selectedNode,
  sourceFieldTree,
  selectedStageState,
  stateSourceField,
  targetStatePath,
  stateTaskMode,
  stateFnExpression,
  stateWhenCondition,
  stateWhenValueRaw,
  stateWhenHasDefault,
  stateWhenDefaultRaw,
  onStateSourceFieldChange,
  onTargetStatePathChange,
  onStateTaskModeChange,
  onStateFnExpressionChange,
  onStateWhenConditionChange,
  onStateWhenValueRawChange,
  onStateWhenHasDefaultChange,
  onStateWhenDefaultRawChange,
  onApplyStateTask,
  onCreateNewStateTask,
  onSelectStateMapping,
  onRemoveStateMapping,
}: StateTaskPanelProps) {
  const { t } = useI18n()
  const labels = {
    title: t('flow.stateTask.title'),
    sourceField: t('flow.stateTask.sourceField'),
    targetPath: t('flow.stateTask.targetPath'),
    mappingMode: t('flow.stateTask.mappingMode'),
    assignMode: t('flow.stateTask.assignMode'),
    functionMode: t('flow.stateTask.functionMode'),
    conditionalMode: t('flow.stateTask.conditionalMode'),
    condition: t('flow.stateTask.condition'),
    valueJson: t('flow.stateTask.valueJson'),
    addDefault: t('flow.stateTask.addDefault'),
    defaultValueJson: t('flow.stateTask.defaultValueJson'),
    apply: t('flow.stateTask.apply'),
    remove: t('flow.stateTask.remove'),
  }
  return (
    <div className="mb-2 rounded-xl border border-slate-200 bg-white p-2.5">
      <h5 className="mb-1 text-sm font-semibold text-slate-800">{labels.title}</h5>
      <p className="mb-2 text-xs text-slate-500">{t('flow.stateTask.subtitle')}</p>
      <label className={`${FB_UI.label} mb-2`}>
        {labels.sourceField}
        <FieldTreePicker
          nodes={sourceFieldTree}
          value={stateSourceField}
          onChange={onStateSourceFieldChange}
          placeholder={t('flow.stateTask.none')}
          emptyLabel={t('flow.stateTask.noFields')}
        />
      </label>
      <label className={`${FB_UI.label} mb-2`}>
        {labels.targetPath}
        <input
          className={FB_UI.input}
          value={targetStatePath}
          onChange={(event) => onTargetStatePathChange(event.target.value)}
          placeholder="entity.totalMileage"
        />
      </label>
      <label className={`${FB_UI.label} mb-2`}>
        {labels.mappingMode}
        <select
          className={FB_UI.input}
          value={stateTaskMode}
          onChange={(event) =>
            onStateTaskModeChange(event.target.value as 'assign' | 'fn' | 'when') // SAFETY: select options are limited to these three literal values
          }
        >
          <option value="assign">{labels.assignMode}</option>
          <option value="fn">{labels.functionMode}</option>
          <option value="when">{labels.conditionalMode}</option>
        </select>
      </label>
      {stateTaskMode === 'fn' ? (
        <FunctionExpressionBuilder
          value={stateFnExpression}
          onChange={onStateFnExpressionChange}
          disabled={!selectedNode}
          expressionPlaceholder={t('flow.stateTask.fnPlaceholder')}
          showLargeBuilderButton={false}
        />
      ) : null}
      {stateTaskMode === 'when' ? (
        <>
          <label className={`${FB_UI.label} mb-2`}>
            {labels.condition}
            <input
              className={FB_UI.input}
              value={stateWhenCondition}
              onChange={(event) => onStateWhenConditionChange(event.target.value)}
              placeholder={t('flow.stateTask.condPlaceholder')}
            />
          </label>
          <label className={`${FB_UI.label} mb-2`}>
            {labels.valueJson}
            <textarea
              className={FB_UI.input}
              rows={4}
              value={stateWhenValueRaw}
              onChange={(event) => onStateWhenValueRawChange(event.target.value)}
              placeholder={t('flow.stateTask.valuePlaceholder')}
            />
          </label>
          <label className={`${FB_UI.label} mb-2 flex items-center gap-2`}>
            <input
              type="checkbox"
              checked={stateWhenHasDefault}
              onChange={(event) => onStateWhenHasDefaultChange(event.target.checked)}
            />
            {labels.addDefault}
          </label>
          {stateWhenHasDefault ? (
            <label className={`${FB_UI.label} mb-2`}>
              {labels.defaultValueJson}
              <textarea
                className={FB_UI.input}
                rows={3}
                value={stateWhenDefaultRaw}
                onChange={(event) => onStateWhenDefaultRawChange(event.target.value)}
                placeholder={t('flow.stateTask.defaultPlaceholder')}
              />
            </label>
          ) : null}
        </>
      ) : null}
      <div className="mb-2 mt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`${FB_UI.secondaryButton} px-3 py-1.5 text-xs`}
            onClick={onCreateNewStateTask}
          >
            {t('flow.stateTask.newMapping')}
          </button>
          <button
            type="button"
            className={`${FB_UI.primaryButton} px-3 py-1.5 text-xs`}
            disabled={
              stateTaskMode === 'assign'
                ? !stateSourceField || !targetStatePath.trim()
                : stateTaskMode === 'fn'
                  ? !targetStatePath.trim() || !stateFnExpression.trim()
                  : !targetStatePath.trim() || !stateWhenCondition.trim() || !stateWhenValueRaw.trim()
            }
            onClick={onApplyStateTask}
          >
            {labels.apply}
          </button>
        </div>
      </div>

      {Object.keys(selectedStageState).length > 0 ? (
        <div className="mt-2 flex flex-col gap-1.5">
          {Object.entries(selectedStageState).map(([statePath, mapping]) => (
            <div key={statePath} className="grid items-center gap-1.5 lg:grid-cols-[minmax(120px,0.9fr)_minmax(0,1.7fr)_auto]">
              <code className="rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] text-slate-700">
                {statePath}
              </code>
              <code className="rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] text-slate-700">
                {JSON.stringify(mapping)}
              </code>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => onSelectStateMapping(statePath, mapping)}
                >
                  {t('flow.common.edit')}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => onRemoveStateMapping(statePath)}
                >
                  {labels.remove}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">{t('flow.stateTask.empty')}</p>
      )}
    </div>
  )
})
