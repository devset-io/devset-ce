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
import { WHEN_CONDITION_FUNCTION_NAMES, type FnKind } from '../../flow-builder/config/function-catalog.ts'
import { FunctionExpressionBuilder } from '../../flow-builder/components/FunctionExpressionBuilder.tsx'
import { FB_FN, FB_SIDEBAR, FB_UI } from '../../flow-builder/ui/ui-classes.ts'
import { useFunctionBuilderState } from '../hooks/useFunctionBuilderState.ts'
import type { FunctionBuilderProps, LiteralKind, ValueMode } from '../types/function-builder.types.ts'

export const FunctionBuilder = React.memo(function FunctionBuilder(props: FunctionBuilderProps) {
  const { disabled = false } = props
  const { t } = useI18n()
  const labels = {
    targetField: t('flow.fnBuilder.targetField'),
    valueType: t('flow.fnBuilder.valueType'),
    valueTypeLiteral: t('flow.fnBuilder.valueType.literal'),
    valueTypeFunction: t('flow.fnBuilder.valueType.function'),
    valueTypeConditional: t('flow.fnBuilder.valueType.conditional'),
    valueTypeRef: t('flow.fnBuilder.valueType.ref'),
    valueTypePath: t('flow.fnBuilder.valueType.path'),
    conditionFunction: t('flow.fnBuilder.conditionFunction'),
    conditionArgA: t('flow.fnBuilder.conditionArgA'),
    conditionArgB: t('flow.fnBuilder.conditionArgB'),
    valueJson: t('flow.fnBuilder.valueJson'),
    addDefault: t('flow.fnBuilder.addDefault'),
    defaultValueJson: t('flow.fnBuilder.defaultValueJson'),
    conditionPreview: t('flow.fnBuilder.conditionPreview'),
    refPath: t('flow.fnBuilder.refPath'),
    runtimePath: t('flow.fnBuilder.runtimePath'),
    literalType: t('flow.fnBuilder.literalType'),
    literalString: t('flow.fnBuilder.literalString'),
    literalNumber: t('flow.fnBuilder.literalNumber'),
    literalBoolean: t('flow.fnBuilder.literalBoolean'),
    literalNull: t('flow.fnBuilder.literalNull'),
    literalJson: t('flow.fnBuilder.literalJson'),
    booleanValue: t('flow.fnBuilder.booleanValue'),
    jsonValue: t('flow.fnBuilder.jsonValue'),
    literalValue: t('flow.fnBuilder.literalValue'),
    apply: t('flow.fnBuilder.apply'),
  }
  const {
    fields,
    effectiveTargetField,
    valueMode,
    fnExpression,
    conditionKind,
    conditionLeftArg,
    conditionRightArg,
    whenValueRaw,
    whenHasDefault,
    whenDefaultRaw,
    literalValue,
    literalKind,
    refValue,
    pathValue,
    whenConditionExpression,
    isApplyDisabled,
    setTargetField,
    setValueMode,
    setFnExpression,
    setConditionKind,
    setConditionLeftArg,
    setConditionRightArg,
    setWhenValueRaw,
    setWhenHasDefault,
    setWhenDefaultRaw,
    setLiteralValue,
    setLiteralKind,
    setRefValue,
    setPathValue,
    handleApply,
  } = useFunctionBuilderState(props)

  return (
    <div className={FB_FN.builder}>
      <fieldset className={FB_FN.fieldset} disabled={disabled}>
        <label className={FB_FN.label}>
          {labels.targetField}
          <input
            className={FB_FN.input}
            list="target-field-options"
            value={effectiveTargetField}
            onChange={(event) => setTargetField(event.target.value)}
            placeholder={t('flow.fnBuilder.targetPlaceholder')}
          />
          <datalist id="target-field-options">
            {fields.map((field) => (
              <option key={field} value={field} />
            ))}
          </datalist>
        </label>

        {valueMode === 'fn' ? (
          <FunctionExpressionBuilder
            value={fnExpression}
            onChange={setFnExpression}
            disabled={disabled}
            showLargeBuilderButton={false}
          />
        ) : null}

        <label className={FB_FN.label}>
          {labels.valueType}
          <select
            className={FB_FN.input}
            value={valueMode}
            onChange={(event) =>
              setValueMode(event.target.value as ValueMode) // SAFETY: select options are constrained to ValueMode values
            }
          >
            <option value="literal">{labels.valueTypeLiteral}</option>
            <option value="fn">{labels.valueTypeFunction}</option>
            <option value="when">{labels.valueTypeConditional}</option>
            <option value="ref">{labels.valueTypeRef}</option>
            <option value="path">{labels.valueTypePath}</option>
          </select>
        </label>

        {valueMode === 'when' ? (
          <>
            <label className={FB_FN.label}>
              {labels.conditionFunction}
              <select
                className={FB_FN.input}
                value={conditionKind}
                onChange={(event) =>
                  setConditionKind(event.target.value as FnKind) // SAFETY: select options are populated from valid FnKind entries
                }
              >
                {WHEN_CONDITION_FUNCTION_NAMES.map((fnName) => (
                  <option key={fnName} value={fnName}>
                    {fnName}(a,b)
                  </option>
                ))}
              </select>
            </label>
            <div className={FB_FN.grid}>
              <label className={FB_FN.label}>
                {labels.conditionArgA}
                <input className={FB_FN.input} value={conditionLeftArg} onChange={(event) => setConditionLeftArg(event.target.value)} />
              </label>
              <label className={FB_FN.label}>
                {labels.conditionArgB}
                <input className={FB_FN.input} value={conditionRightArg} onChange={(event) => setConditionRightArg(event.target.value)} />
              </label>
            </div>
            <label className={FB_FN.label}>
              {labels.valueJson}
              <textarea
                className={FB_FN.textarea}
                rows={5}
                value={whenValueRaw}
                onChange={(event) => setWhenValueRaw(event.target.value)}
                placeholder={t('flow.fnBuilder.whenValuePlaceholder')}
              />
            </label>
            <label className={FB_SIDEBAR.checkbox}>
              <input
                type="checkbox"
                checked={whenHasDefault}
                onChange={(event) => setWhenHasDefault(event.target.checked)}
              />
              {labels.addDefault}
            </label>
            {whenHasDefault ? (
              <label className={FB_FN.label}>
                {labels.defaultValueJson}
                <textarea
                  className={FB_FN.textarea}
                  rows={5}
                  value={whenDefaultRaw}
                  onChange={(event) => setWhenDefaultRaw(event.target.value)}
                  placeholder={t('flow.fnBuilder.whenDefaultPlaceholder')}
                />
              </label>
            ) : null}
            <label className={FB_FN.label}>
              {labels.conditionPreview}
              <input className={FB_FN.input} readOnly value={whenConditionExpression} />
            </label>
          </>
        ) : null}

        {valueMode === 'ref' ? (
          <label className={FB_FN.label}>
            {labels.refPath}
            <input
              className={FB_FN.input}
              value={refValue}
              onChange={(event) => setRefValue(event.target.value)}
              placeholder={t('flow.fnBuilder.refPlaceholder')}
            />
          </label>
        ) : null}

        {valueMode === 'path' ? (
          <label className={FB_FN.label}>
            {labels.runtimePath}
            <input
              className={FB_FN.input}
              value={pathValue}
              onChange={(event) => setPathValue(event.target.value)}
              placeholder={t('flow.fnBuilder.pathPlaceholder')}
            />
          </label>
        ) : null}

        {valueMode === 'literal' ? (
          <>
            <label className={FB_FN.label}>
              {labels.literalType}
              <select
                className={FB_FN.input}
                value={literalKind}
                onChange={(event) =>
                  setLiteralKind(event.target.value as LiteralKind) // SAFETY: select options are constrained to LiteralKind values
                }
              >
                <option value="string">{labels.literalString}</option>
                <option value="number">{labels.literalNumber}</option>
                <option value="boolean">{labels.literalBoolean}</option>
                <option value="null">{labels.literalNull}</option>
                <option value="json">{labels.literalJson}</option>
              </select>
            </label>
            {literalKind === 'boolean' ? (
              <label className={FB_FN.label}>
                {labels.booleanValue}
                <select className={FB_FN.input} value={literalValue} onChange={(event) => setLiteralValue(event.target.value)}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
            ) : literalKind === 'null' ? (
              <p className={FB_FN.help}>{t('flow.fnBuilder.nullHint')}</p>
            ) : literalKind === 'json' ? (
              <label className={FB_FN.label}>
                {labels.jsonValue}
                <textarea
                  className={FB_FN.textarea}
                  rows={8}
                  value={literalValue}
                  onChange={(event) => setLiteralValue(event.target.value)}
                  placeholder={t('flow.fnBuilder.jsonPlaceholder')}
                />
              </label>
            ) : (
              <label className={FB_FN.label}>
                {labels.literalValue}
                <input
                  className={FB_FN.input}
                  value={literalValue}
                  onChange={(event) => setLiteralValue(event.target.value)}
                  placeholder={
                    literalKind === 'number'
                      ? t('flow.fnBuilder.numberPlaceholder')
                      : t('flow.fnBuilder.stringPlaceholder')
                  }
                />
              </label>
            )}
          </>
        ) : null}

        <button
          type="button"
          disabled={isApplyDisabled}
          onClick={handleApply}
          className={FB_UI.primaryButton}
        >
          {labels.apply}
        </button>
      </fieldset>
    </div>
  )
})
