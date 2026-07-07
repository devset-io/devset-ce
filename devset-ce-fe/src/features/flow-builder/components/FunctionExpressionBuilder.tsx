/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../../../core/i18n/I18nProvider'
import { CodeEditor } from '../../../shared/components/CodeEditor'
import { ModalShell } from './ModalShell'
import { createFnOnlyCompleter } from '../config/dsl-completer'
import { FB_CODE_EDITOR, FB_FN, FB_PREVIEW, FB_UI, fnTokenFnClass } from '../ui/ui-classes'
import {
  DEFAULT_FUNCTION_KIND,
  FUNCTION_EDITOR_MODES,
  FUNCTION_EXAMPLES,
  FUNCTION_HINTS,
  FUNCTION_LABELS,
  FUNCTION_NAMES,
  type FnKind,
  buildFnExpression,
  isFnKind,
} from '../config/function-catalog'

type FunctionExpressionBuilderProps = {
  value: string
  onChange: (nextExpression: string) => void
  disabled?: boolean
  expressionPlaceholder?: string
  showInlineExpressionEditor?: boolean
  showLargeBuilderButton?: boolean
}

const splitTopLevelArgs = (raw: string): string[] => {
  const args: string[] = []
  let current = ''
  let depth = 0

  for (const char of raw) {
    if (char === '(') {
      depth += 1
      current += char
      continue
    }
    if (char === ')') {
      depth = Math.max(0, depth - 1)
      current += char
      continue
    }
    if (char === ',' && depth === 0) {
      const token = current.trim()
      if (token) {
        args.push(token)
      }
      current = ''
      continue
    }
    current += char
  }

  const tail = current.trim()
  if (tail) {
    args.push(tail)
  }
  return args
}

type ParsedFnNode =
  | { type: 'atom'; raw: string }
  | { type: 'fn'; name: string; args: ParsedFnNode[]; raw: string }

const parseFnNode = (raw: string): ParsedFnNode => {
  const normalized = raw.trim()
  if (!normalized) {
    return { type: 'atom', raw: '' }
  }
  const bareFnMatch = normalized.match(/^[a-zA-Z][a-zA-Z0-9]*$/)
  if (bareFnMatch) {
    return { type: 'fn', name: normalized, args: [], raw: normalized }
  }
  const fnMatch = normalized.match(/^([a-zA-Z][a-zA-Z0-9]*)\((.*)\)$/)
  if (!fnMatch) {
    return { type: 'atom', raw: normalized }
  }
  const name = fnMatch[1]
  const argsRaw = fnMatch[2]
  const args = splitTopLevelArgs(argsRaw).map(parseFnNode)
  return { type: 'fn', name, args, raw: normalized }
}

const renderFnNodePretty = (node: ParsedFnNode, depth = 0, trailingComma = false): ReactNode => {
  const depthClass = fnTokenFnClass(depth)
  const comma = trailingComma ? <span className={FB_PREVIEW.tokenPunct}>,</span> : null
  const indentStyle = { paddingLeft: `${depth * 14}px` }

  if (node.type === 'atom') {
    return (
      <div className={FB_PREVIEW.line} style={indentStyle}>
        <span className={FB_PREVIEW.tokenArg}>{node.raw}</span>
        {comma}
      </div>
    )
  }

  if (node.args.length === 0) {
    return (
      <div className={FB_PREVIEW.line} style={indentStyle}>
        <span className={depthClass}>{node.name}</span>
        <span className={FB_PREVIEW.tokenPunct}>(</span>
        <span className={FB_PREVIEW.tokenPunct}>)</span>
        {comma}
      </div>
    )
  }

  return (
    <>
      <div className={FB_PREVIEW.line} style={indentStyle}>
        <span className={depthClass}>{node.name}</span>
        <span className={FB_PREVIEW.tokenPunct}>(</span>
      </div>
      {node.args.map((arg, index) => (
        <Fragment key={`${node.raw}-${depth}-${index}`}>
          {renderFnNodePretty(arg, depth + 1, index < node.args.length - 1)}
        </Fragment>
      ))}
      <div className={FB_PREVIEW.line} style={indentStyle}>
        <span className={FB_PREVIEW.tokenPunct}>)</span>
        {comma}
      </div>
    </>
  )
}

const renderExpressionPreview = (expression: string): ReactNode => {
  const normalizedExpression = expression.replace(/\s+/g, '')
  return renderFnNodePretty(parseFnNode(normalizedExpression))
}

export const FunctionExpressionBuilder = React.memo(function FunctionExpressionBuilder({
  value,
  onChange,
  disabled = false,
  expressionPlaceholder,
  showInlineExpressionEditor = true,
  showLargeBuilderButton = true,
}: FunctionExpressionBuilderProps) {
  const { t, locale } = useI18n()
  const completers = useMemo(() => [createFnOnlyCompleter(locale)], [locale])
  const labels = {
    functionLabel: t('flow.fnExpr.functionLabel'),
    functionHelpAria: t('flow.fnExpr.functionHelpAria'),
    min: t('flow.fnExpr.min'),
    max: t('flow.fnExpr.max'),
    choiceValues: t('flow.fnExpr.choiceValues'),
    weightValuePlaceholder: t('flow.fnExpr.weightValuePlaceholder'),
    weightWeightPlaceholder: t('flow.fnExpr.weightWeightPlaceholder'),
    addWeightRow: t('flow.fnExpr.addWeightRow'),
    argA: t('flow.fnExpr.argA'),
    argB: t('flow.fnExpr.argB'),
    syntaxPreview: t('flow.fnExpr.syntaxPreview'),
    functionExpression: t('flow.fnExpr.functionExpression'),
    functionInput: t('flow.fnExpr.functionInput'),
    modeBuilder: t('flow.fnExpr.modeBuilder'),
    modeExpression: t('flow.fnExpr.modeExpression'),
    openLargeBuilder: t('flow.fnExpr.openLargeBuilder'),
    modalTitle: t('flow.fnExpr.modalTitle'),
    modalSubtitle: t('flow.fnExpr.modalSubtitle'),
  }
  const effectiveExpressionPlaceholder = expressionPlaceholder ?? t('flow.fnExpr.defaultPlaceholder')
  const [inputMode, setInputMode] = useState<'builder' | 'expression'>('builder')
  const [kind, setKind] = useState<FnKind>(DEFAULT_FUNCTION_KIND)
  const [min, setMin] = useState('1')
  const [max, setMax] = useState('200')
  const [choiceValuesRaw, setChoiceValuesRaw] = useState('A,B,C')
  const [leftArg, setLeftArg] = useState('.value')
  const [rightArg, setRightArg] = useState('.verifiedMileage')
  const [isLargeBuilderOpen, setIsLargeBuilderOpen] = useState(false)
  const suppressNextBuilderEmitRef = useRef(true)
  const [weightedRows, setWeightedRows] = useState<Array<{ value: string; weight: string }>>([
    { value: '10', weight: '50' },
    { value: '20', weight: '30' },
    { value: '30', weight: '20' },
  ])

  const hydrateFromExpression = (expressionToParse: string) => {
    const normalized = expressionToParse.trim()
    if (isFnKind(normalized) && FUNCTION_EDITOR_MODES[normalized] === 'bare') {
      setKind(normalized)
      return
    }

    const fnMatch = normalized.match(/^([a-zA-Z][a-zA-Z0-9]*)\((.*)\)$/)
    if (!fnMatch) {
      return
    }
    const parsedKind = fnMatch[1]
    const rawArgs = fnMatch[2]
    if (!isFnKind(parsedKind)) {
      return
    }
    setKind(parsedKind)

    const editorMode = FUNCTION_EDITOR_MODES[parsedKind]

    if (editorMode === 'range') {
      const [nextMin, nextMax] = splitTopLevelArgs(rawArgs)
      if (nextMin) setMin(nextMin)
      if (nextMax) setMax(nextMax)
      return
    }
    if (editorMode === 'choice') {
      setChoiceValuesRaw(rawArgs)
      return
    }
    if (editorMode === 'choiceWeighted') {
      const rows = splitTopLevelArgs(rawArgs)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const [nextValue, nextWeight] = item.split(':').map((part) => part.trim())
          return { value: nextValue ?? '', weight: nextWeight ?? '' }
        })
      if (rows.length > 0) {
        setWeightedRows(rows)
      }
      return
    }

    const [argA, argB] = splitTopLevelArgs(rawArgs)
    if (argA) setLeftArg(argA)
    if (argB) setRightArg(argB)
  }

  const expression = useMemo(() => {
    return buildFnExpression(kind, {
      leftArg,
      rightArg,
      min,
      max,
      choiceValuesRaw,
      weightedRows,
    })
  }, [choiceValuesRaw, kind, leftArg, max, min, rightArg, weightedRows])
  const editorMode = FUNCTION_EDITOR_MODES[kind]
  const previewSource = inputMode === 'expression' ? value : expression
  const previewTree = useMemo(() => renderExpressionPreview(previewSource), [previewSource])

  useEffect(() => {
    if (inputMode === 'builder' && value.trim()) {
      suppressNextBuilderEmitRef.current = true
      // eslint-disable-next-line react-hooks/set-state-in-effect
      hydrateFromExpression(value)
    }
  }, [inputMode, value])

  useEffect(() => {
    if (inputMode !== 'builder') {
      return
    }
    if (suppressNextBuilderEmitRef.current) {
      suppressNextBuilderEmitRef.current = false
      if (!value.trim()) {
        onChange(expression)
      }
      return
    }
    if (expression === value) {
      return
    }
    onChange(expression)
  }, [expression, inputMode, onChange, value])

  const renderEditorBody = (isLargeView: boolean, forceExpressionEditor = false) =>
    inputMode === 'builder' ? (
      <>
        <label className={FB_UI.label}>
          {labels.functionLabel}
          <select className={FB_UI.input} value={kind} onChange={(event) => { if (isFnKind(event.target.value)) setKind(event.target.value) }}>
            {FUNCTION_NAMES.map((fnName) => (
              <option key={fnName} value={fnName}>
                {t(FUNCTION_LABELS[fnName])}
              </option>
            ))}
          </select>
        </label>
        <div className={FB_FN.helpInline}>
          <span>{t('flow.fnExpr.helpTitle')}</span>
          <button type="button" className={`group ${FB_FN.helpTrigger}`} aria-label={labels.functionHelpAria} aria-describedby="fn-help-tooltip">
            {'?'}
            <span id="fn-help-tooltip" role="tooltip" className={FB_FN.tooltip}>
              <strong>{t('flow.fnExpr.helpDesc')}</strong> {t(FUNCTION_HINTS[kind])}
              <br />
              <strong>{t('flow.fnExpr.helpExample')}</strong> <code>{FUNCTION_EXAMPLES[kind]}</code>
            </span>
          </button>
        </div>

        {editorMode === 'range' ? (
          <div className={FB_FN.grid}>
            <label className={FB_UI.label}>
              {labels.min}
              <input className={FB_UI.input} value={min} onChange={(event) => setMin(event.target.value)} />
            </label>
            <label className={FB_UI.label}>
              {labels.max}
              <input className={FB_UI.input} value={max} onChange={(event) => setMax(event.target.value)} />
            </label>
          </div>
        ) : null}

        {editorMode === 'choice' ? (
          <label className={FB_UI.label}>
            {labels.choiceValues}
            <input
              className={FB_UI.input}
              value={choiceValuesRaw}
              onChange={(event) => setChoiceValuesRaw(event.target.value)}
              placeholder={t('flow.fnExpr.choicePlaceholder')}
            />
          </label>
        ) : null}

        {editorMode === 'choiceWeighted' ? (
          <div className="fn-weights">
            {weightedRows.map((row, index) => (
              <div key={`weighted-row-${index}`} className={FB_FN.row}>
                <input
                  aria-label="Value"
                  className={FB_UI.input}
                  value={row.value}
                  onChange={(event) =>
                    setWeightedRows((current) =>
                      current.map((entry, i) => (i === index ? { ...entry, value: event.target.value } : entry)),
                    )
                  }
                  placeholder={labels.weightValuePlaceholder}
                />
                <input
                  aria-label="Weight"
                  className={FB_UI.input}
                  value={row.weight}
                  onChange={(event) =>
                    setWeightedRows((current) =>
                      current.map((entry, i) => (i === index ? { ...entry, weight: event.target.value } : entry)),
                    )
                  }
                  placeholder={labels.weightWeightPlaceholder}
                />
              </div>
            ))}
            <button
              type="button"
              className={`${FB_UI.secondaryButton} py-1.5 text-xs`}
              onClick={() => setWeightedRows((current) => [...current, { value: '0', weight: '1' }])}
            >
              {labels.addWeightRow}
            </button>
          </div>
        ) : null}

        {editorMode === 'binary' ? (
          <div className={FB_FN.grid}>
            <label className={FB_UI.label}>
              {labels.argA}
              <input className={FB_UI.input} value={leftArg} onChange={(event) => setLeftArg(event.target.value)} />
            </label>
            <label className={FB_UI.label}>
              {labels.argB}
              <input className={FB_UI.input} value={rightArg} onChange={(event) => setRightArg(event.target.value)} />
            </label>
          </div>
        ) : null}

        <div className={`${FB_PREVIEW.rich} ${isLargeView ? FB_PREVIEW.richLarge : ''}`} aria-label={labels.syntaxPreview}>
          <div className={FB_PREVIEW.expression}>{previewTree}</div>
        </div>
      </>
    ) : (
      <>
        {showInlineExpressionEditor || forceExpressionEditor ? (
          <label className={FB_UI.label}>
            {labels.functionExpression}
            <CodeEditor
              className={FB_CODE_EDITOR.fnEditorWrap}
              language="plaintext"
              ariaLabel={labels.functionExpression}
              value={value}
              height={isLargeView ? '280px' : '160px'}
              readOnly={disabled}
              onChange={onChange}
              completers={completers}
            />
          </label>
        ) : (
          <p className={FB_UI.hint}>{t('flow.fnExpr.editorHint')}</p>
        )}
        {!value.trim() && (showInlineExpressionEditor || forceExpressionEditor) ? (
          <p className={FB_UI.hint}>{effectiveExpressionPlaceholder}</p>
        ) : null}
        <div className={`${FB_PREVIEW.rich} ${isLargeView ? FB_PREVIEW.richLarge : ''}`} aria-label={labels.syntaxPreview}>
          <div className={FB_PREVIEW.expression}>{previewTree}</div>
        </div>
      </>
    )

  return (
    <>
      <fieldset disabled={disabled} className="flex flex-col gap-2">
        <div className="flex items-end justify-between gap-2">
          <label className={`${FB_UI.label} flex-1`}>
            {labels.functionInput}
            <select
              className={FB_UI.input}
              value={inputMode}
              onChange={(event) => {
                const nextMode = event.target.value as 'builder' | 'expression' // SAFETY: select options are limited to these two values
                setInputMode(nextMode)
                if (nextMode === 'expression') {
                  onChange(expression)
                }
              }}
            >
              <option value="builder">{labels.modeBuilder}</option>
              <option value="expression">{labels.modeExpression}</option>
            </select>
          </label>
          {showLargeBuilderButton ? (
            <button
              type="button"
              className={`${FB_UI.secondaryButton} mb-0.5 shrink-0 px-3 py-2 text-xs`}
              onClick={() => setIsLargeBuilderOpen(true)}
            >
              {labels.openLargeBuilder}
            </button>
          ) : null}
        </div>
        {renderEditorBody(false)}
      </fieldset>

      <ModalShell
        isOpen={isLargeBuilderOpen && showLargeBuilderButton}
        title={labels.modalTitle}
        subtitle={labels.modalSubtitle}
        onClose={() => setIsLargeBuilderOpen(false)}
        zIndexClassName="z-[70]"
        containerClassName="max-h-[90vh] max-w-[1120px] gap-3"
      >
        <div className="min-h-0 overflow-auto pr-1">
          <fieldset disabled={disabled} className="flex flex-col gap-3">
            <label className={FB_UI.label}>
              {labels.functionInput}
              <select
                className={FB_UI.input}
                value={inputMode}
                onChange={(event) => {
                  const nextMode = event.target.value as 'builder' | 'expression' // SAFETY: select options are limited to these two values
                  setInputMode(nextMode)
                  if (nextMode === 'expression') {
                    onChange(expression)
                  }
                }}
              >
                <option value="builder">{labels.modeBuilder}</option>
                <option value="expression">{labels.modeExpression}</option>
              </select>
            </label>
            {renderEditorBody(true, true)}
          </fieldset>
        </div>
      </ModalShell>
    </>
  )
})
