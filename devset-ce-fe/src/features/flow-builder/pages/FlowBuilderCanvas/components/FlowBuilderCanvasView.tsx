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
import { AddStepSchemaModal } from './AddStepSchemaModal'
import { BuilderSidebar } from '../../../components/BuilderSidebar'
import { DbQueryEditorModal } from './DbQueryEditorModal'
import { DeleteStageModal } from './DeleteStageModal'
import { FunctionStudioDrawer } from '../../../../../shared/components/FunctionStudioDrawer'
import { PayloadEditorModal } from './PayloadEditorModal'
import { WorkflowStateEditorModal } from './WorkflowStateEditorModal'
import { BuilderCanvasPanel } from '../../../components/builder-canvas/BuilderCanvasPanel'
import type {
  FlowBuilderCanvasAction,
  FlowBuilderCanvasViewData,
} from '../state/FlowBuilderCanvas.types'
import { FB_LAYOUT } from '../../../ui/ui-classes'

// ──────────────────────────────────────────────────────────────
// FlowBuilderCanvasView
//
// Top-level view component for the canvas page. Receives all
// data from the page hook via `data` and forwards user actions
// via `onAction`. Renders:
//   - BuilderCanvasPanel (graph editor)
//   - BuilderSidebar (node tools + workflow controls)
//   - FunctionStudioDrawer (field override editor)
//   - Modals (add step, delete stage, payload editor, state editor)
// ──────────────────────────────────────────────────────────────

interface FlowBuilderCanvasViewProps {
  data: FlowBuilderCanvasViewData
  onAction: (action: FlowBuilderCanvasAction) => void
}

export const FlowBuilderCanvasView = React.memo(function FlowBuilderCanvasView({
  data,
  onAction,
}: FlowBuilderCanvasViewProps) {
  const {
    builderState,
    sidebarViewData,
    canvasViewData,
    isPayloadEditorOpen,
    isAddStepModalOpen,
    isDbQueryEditorOpen,
    isDeleteStageModalOpen,
    deleteStageName,
  } = data

  // Determine query edit state: check selectedNode first, then fall back to any existing query node.
  const selectedNodeHasQuery =
    builderState.selectedNode !== null &&
    Boolean(builderState.queryOverridesByNode[builderState.selectedNode.id])

  const fallbackQueryEntry = (() => {
    if (selectedNodeHasQuery) return null // not needed
    const entries = Object.entries(builderState.queryOverridesByNode)
    return entries.length > 0 ? { nodeId: entries[0][0], config: entries[0][1] } : null
  })()

  const isQueryEdit = selectedNodeHasQuery || fallbackQueryEntry !== null

  return (
    <div className={FB_LAYOUT.grid}>
      {/* Graph editor – ReactFlow handlers are passed directly for performance */}
      <BuilderCanvasPanel
        data={canvasViewData}
        onAction={onAction}
        onNodesChange={builderState.onNodesChange}
        onEdgesChange={builderState.onEdgesChange}
        onConnect={builderState.handleConnect}
      />

      {/* Sidebar – all data via viewData bag, all interactions via onAction */}
      <BuilderSidebar
        data={sidebarViewData}
        onAction={onAction}
      />

      {/* Function studio drawer – still consumes builderState directly
          because it has its own complex internal hook state */}
      <FunctionStudioDrawer
        isOpen={builderState.isFunctionStudioOpen}
        selectedNode={builderState.selectedNode}
        selectedStageDsl={builderState.selectedStageDsl}
        onApplySelectedStageDslRaw={builderState.applySelectedStageDslRaw}
        selectedSource={builderState.selectedNode?.data.source ?? 'none'}
        selectedEvent={builderState.selectedNode?.data.event ?? ''}
        selectedSchema={builderState.selectedSchema}
        schemas={builderState.schemas}
        availableEvents={builderState.availableEvents}
        isSchemaLoading={builderState.isSchemaLoading}
        onSourceChange={(source) => onAction({ type: 'selectedNodeSourceChanged', source })}
        onSchemaChange={(schemaEvent) =>
          onAction({ type: 'selectedNodeSchemaChanged', schemaEvent })
        }
        setEntries={builderState.setEntries}
        studioSelectedField={builderState.studioSelectedField}
        onSelectField={(field) => onAction({ type: 'selectStudioField', field })}
        onClose={() => onAction({ type: 'closeFunctionStudio' })}
        onSaveDraftChanges={async () => onAction({ type: 'saveDefinition' })}
        setFieldOptions={builderState.setFieldOptions}
        schemaRootFields={builderState.selectedEventSchemaRootFields}
        schemaLiteralKindHints={builderState.selectedEventSchemaLiteralKindHints}
        schemaRequiredRootFields={builderState.selectedEventSchemaRequiredRootFields}
        inheritedFields={builderState.selectedInheritedFields}
        selectedFieldExpression={builderState.selectedFieldExpression}
        selectedFieldMode={builderState.selectedFieldEntry?.kind}
        selectedFieldValue={builderState.selectedFieldEntry?.preview ?? null}
        selectedFieldRawValue={builderState.selectedFieldRawValue}
        selectedStageState={builderState.selectedStageState}
        workflowState={builderState.workflowState}
        selectedStageWireFormat={builderState.selectedStageWireFormat}
        onApplyFunction={builderState.applyFunctionOverride}
        onAddStateMapping={builderState.addStateMappingFromField}
        onRemoveStateMapping={builderState.removeStateMapping}
        onSetStageWireFormat={builderState.setSelectedStageWireFormat}
        onClearStageWireFormat={builderState.clearSelectedStageWireFormat}
        overrides={
          builderState.selectedNode
            ? builderState.fnOverridesByNode[builderState.selectedNode.id]
            : undefined
        }
      />

      <WorkflowStateEditorModal
        isOpen={builderState.isWorkflowStateEditorOpen}
        state={builderState.workflowState}
        onSave={async (nextState) => onAction({ type: 'saveWorkflowState', state: nextState })}
        onClose={() => onAction({ type: 'closeWorkflowStateEditor' })}
      />

      <DbQueryEditorModal
        isOpen={isDbQueryEditorOpen}
        stageName={
          selectedNodeHasQuery
            ? builderState.selectedNode!.data.stage
            : fallbackQueryEntry
              ? builderState.nodes.find((n) => n.id === fallbackQueryEntry.nodeId)?.data.stage ?? ''
              : ''
        }
        isEdit={isQueryEdit}
        initialQuery={
          selectedNodeHasQuery
            ? builderState.queryOverridesByNode[builderState.selectedNode!.id]
            : fallbackQueryEntry?.config ?? null
        }
        workflowState={builderState.workflowState}
        onSave={(query) => onAction({ type: 'saveDbQuery', query, isEdit: isQueryEdit })}
        onRemove={() => onAction({ type: 'removeDbQuery' })}
        onClose={() => onAction({ type: 'closeDbQueryEditor' })}
      />

      <PayloadEditorModal
        isOpen={isPayloadEditorOpen}
        payload={builderState.payload}
        payloadDraft={builderState.payloadDraft}
        isPayloadDraftDirty={builderState.isPayloadDraftDirty}
        payloadDraftError={builderState.payloadDraftError}
        onPayloadDraftChange={builderState.updatePayloadDraft}
        onFormatPayloadDraft={builderState.formatPayloadDraft}
        onResetPayloadDraft={builderState.resetPayloadDraftFromBuilder}
        onClose={() => onAction({ type: 'closePayloadEditor' })}
      />

      <AddStepSchemaModal
        isOpen={isAddStepModalOpen}
        schemas={builderState.schemas}
        onClose={() => onAction({ type: 'closeAddStepModal' })}
        onConfirm={(schemaEvent) => onAction({ type: 'confirmAddStep', schemaEvent })}
      />

      <DeleteStageModal
        isOpen={isDeleteStageModalOpen}
        stageName={deleteStageName}
        onCancel={() => onAction({ type: 'cancelDeleteStage' })}
        onConfirm={() => onAction({ type: 'confirmDeleteStage' })}
      />
    </div>
  )
})
