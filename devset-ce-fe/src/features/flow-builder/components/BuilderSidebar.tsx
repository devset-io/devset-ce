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
import { EmptyNodeToolsPanel } from './sidebar/EmptyNodeToolsPanel'
import { EmitPanel } from './sidebar/EmitPanel'
import { FunctionStudioPanel } from './sidebar/FunctionStudioPanel'
import { NodeInspectorPanel } from './sidebar/NodeInspectorPanel'
import { QueryPanel } from './sidebar/QueryPanel'
import { RepeatPanel } from './sidebar/RepeatPanel'
import { WaitPanel } from './sidebar/WaitPanel'
import { WorkflowPanel } from './sidebar/WorkflowPanel'
import type {
  BuilderSidebarViewData,
  FlowBuilderCanvasAction,
} from '../pages/FlowBuilderCanvas/state/FlowBuilderCanvas.types'

// ──────────────────────────────────────────────────────────────
// BuilderSidebar
//
// Pure presentational component wrapped in React.memo.
// All state lives in the page reducer; all user interactions
// are dispatched as actions via onAction.
//
// Previously this component had 20+ props, 8 useState hooks,
// and 2 useEffects (one of which caused a render loop).
// Now it's a thin shell that reads from `data` and dispatches
// actions — no local state, no effects.
// ──────────────────────────────────────────────────────────────

interface BuilderSidebarProps {
  data: BuilderSidebarViewData
  onAction: (action: FlowBuilderCanvasAction) => void
}

export const BuilderSidebar = React.memo(function BuilderSidebar({ data, onAction }: BuilderSidebarProps) {
  const {
    workflowId,
    hasUnsavedChanges,
    isSchemaLoading,
    schemaError,
    schemasCount,
    selectedNode,
    workflowStateFields,
    payloadDraftError,
    existingFunctionsCount,
    isSaving,
    openSection,
    repeatDraft,
    showRepeatWhile,
    showRepeatUntil,
    waitDraft,
    emitDraft,
    inspectorDraft,
    selectedQueryConfig,
    queryNodeStage,
  } = data

  return (
    <aside className="flex max-h-[calc(100vh-165px)] flex-col gap-3 overflow-auto pr-1">
      <WorkflowPanel
        workflowId={workflowId}
        onWorkflowIdChange={(value) => onAction({ type: 'workflowIdChanged', value })}
        workflowStateFields={workflowStateFields}
        onOpenWorkflowStateEditor={() => onAction({ type: 'openWorkflowStateEditor' })}
        onOpenPayloadEditor={() => onAction({ type: 'openPayloadEditor' })}
        onOpenPlayground={() => onAction({ type: 'openPlayground' })}
        isSchemaLoading={isSchemaLoading}
        schemasCount={schemasCount}
        schemaError={schemaError}
        payloadDraftError={payloadDraftError}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        onSave={() => onAction({ type: 'sidebarSaveRequested' })}
      />

      <QueryPanel
        selectedStage={queryNodeStage}
        queryConfig={selectedQueryConfig}
        onOpenQueryEditor={() => onAction({ type: 'openDbQueryEditor' })}
      />

      {selectedNode ? (
        <>
          <RepeatPanel
            open={openSection === 'repeat'}
            onToggle={(next) => onAction({ type: 'sidebarSectionToggled', section: 'repeat', open: next })}
            draft={repeatDraft}
            onDraftChange={(field, value) => onAction({ type: 'sidebarRepeatDraftChanged', field, value })}
            showRepeatWhile={showRepeatWhile}
            showRepeatUntil={showRepeatUntil}
            onShowRepeatWhile={(next) => onAction({ type: 'sidebarRepeatWhileToggled', show: next })}
            onShowRepeatUntil={(next) => onAction({ type: 'sidebarRepeatUntilToggled', show: next })}
          />

          <WaitPanel
            open={openSection === 'wait'}
            onToggle={(next) => onAction({ type: 'sidebarSectionToggled', section: 'wait', open: next })}
            waitValue={waitDraft}
            onWaitChange={(value) => onAction({ type: 'sidebarWaitDraftChanged', value })}
          />

          <EmitPanel
            open={openSection === 'emit'}
            onToggle={(next) => onAction({ type: 'sidebarSectionToggled', section: 'emit', open: next })}
            emitMode={emitDraft.mode}
            emitFnExpression={emitDraft.fn}
            onModeChange={(mode) => onAction({ type: 'sidebarEmitModeChanged', mode })}
            onFnChange={(value) => onAction({ type: 'sidebarEmitFnChanged', value })}
          />

          <NodeInspectorPanel
            open={openSection === 'inspector'}
            onToggle={(next) => onAction({ type: 'sidebarSectionToggled', section: 'inspector', open: next })}
            title={inspectorDraft.title}
            stage={inspectorDraft.stage}
            onChange={(field, value) => onAction({ type: 'sidebarInspectorChanged', field, value })}
            onDelete={() =>
              onAction({ type: 'requestDeleteStage', nodeId: selectedNode.id, stage: selectedNode.data.stage })
            }
          />

          <FunctionStudioPanel
            selectedStage={selectedNode.data.stage}
            existingFunctionsCount={existingFunctionsCount}
            onOpenFunctionStudio={() => onAction({ type: 'openFunctionStudio' })}
          />
        </>
      ) : (
        <EmptyNodeToolsPanel />
      )}
    </aside>
  )
})
