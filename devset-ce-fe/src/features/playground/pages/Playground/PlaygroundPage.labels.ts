/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

// ──────────────────────────────────────────────────────────────
// Playground labels builder
//
// Extracted from PlaygroundPage to keep the page shell thin.
// This is a pure function — it takes the i18n `t` function and
// returns all the translated label strings the Playground UI needs.
// ──────────────────────────────────────────────────────────────

import type { PlaygroundLabels } from './state/Playground.types'

/**
 * Build the complete labels object for the Playground page.
 *
 * @param t - the i18n translation function from useI18n()
 * @returns PlaygroundLabels with all translated strings
 */
export function buildPlaygroundLabels(t: (key: string) => string): PlaygroundLabels {
  return {
    sourceMode: t('playground.editor.sourceMode'),
    sourceModeWorkflow: t('playground.editor.sourceModeWorkflow'),
    sourceModeJson: t('playground.editor.sourceModeJson'),
    workflowSelect: t('playground.editor.workflowSelect'),
    workflowEmpty: t('playground.editor.workflowEmpty'),
    openJsonModal: t('playground.editor.openJsonModal'),
    previewing: t('playground.editor.previewing'),
    preview: t('playground.editor.preview'),
    originFlowBuilder: t('playground.origin.flowBuilder'),
    originFlowBuilderWithId: t('playground.origin.flowBuilderWithId'),
    backToBuilder: t('playground.backToBuilder'),
    jsonModalTitle: t('playground.editor.jsonModalTitle'),
    jsonModalSubtitle: t('playground.editor.jsonModalSubtitle'),
    clearJson: t('playground.editor.clearJson'),
    saveJson: t('playground.editor.saveJson'),
    errors: {
      loadCatalog: t('playground.error.loadCatalog'),
      requestFailed: t('playground.error.requestFailed'),
      invalidJson: t('playground.error.invalidJson'),
    },
    monitoring: {
      title: t('playground.monitor.title'),
      empty: t('playground.monitor.empty'),
      compiled: t('playground.monitor.compiled'),
      notCompiled: t('playground.monitor.notCompiled'),
      searchScopeLabel: t('playground.log.scope.label'),
      eventSearchPlaceholder: t('playground.events.searchPlaceholder'),
      backToBuilder: t('playground.backToBuilder'),
      stage: t('playground.stageStrip.stage'),
      events: t('playground.stageStrip.events'),
      result: t('playground.stageStrip.result'),
      finalResult: t('playground.stageStrip.final'),
      eventLogTitle: t('playground.log.title'),
      searchScopeBoth: t('playground.log.scope.both'),
      searchScopePayload: t('playground.log.scope.payload'),
      searchScopeHeader: t('playground.log.scope.header'),
      detailsTitle: t('playground.details.title'),
      range: t('playground.details.range'),
      rangeFinal: t('playground.details.range.final'),
      rangeProduced: t('playground.details.range.stage'),
      stageLabel: t('playground.details.stage'),
      stageFinal: t('playground.details.stage.final'),
      eventLabel: t('playground.details.event'),
      headerJson: t('playground.details.headerJson'),
      payloadJson: t('playground.details.payloadJson'),
      copy: t('playground.details.copy'),
    },
  }
}
