/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type EdgeChange,
  type Edge,
  type NodeChange,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react'
import React, { useMemo, useState } from 'react'
import { BuilderCanvasHeader } from './BuilderCanvasHeader'
import { BuilderNodeComponent } from './BuilderNode'
import { StateNodeComponent } from './WorkflowStateNode'
import type { BuilderNodeData, StateNodeData } from '../../types'
import type { BuilderCanvasPanelViewData, FlowBuilderCanvasAction } from '../../pages/FlowBuilderCanvas/state/FlowBuilderCanvas.types'
import { FB_LAYOUT } from '../../ui/ui-classes'
import {
  buildBuilderNodesWithFlowRole,
  buildDefaultStateNodePosition,
  buildOrderByNodeId,
  buildStateNode,
  buildStateReferenceEdges,
  filterBaseEdges,
  filterEdgeChangesWithoutStateRef,
  filterNodeChangesWithoutStateNode,
  isStateNodeConnection,
  WORKFLOW_STATE_NODE_ID,
  sortBuilderNodes,
} from './builder-canvas.utils'

// ──────────────────────────────────────────────────────────────
// BuilderCanvasPanel
//
// Wrapped in React.memo. User-initiated actions go through
// onAction. ReactFlow framework handlers (onNodesChange,
// onEdgesChange, onConnect) stay as separate props because
// they fire on every drag/resize frame.
// ──────────────────────────────────────────────────────────────

interface BuilderCanvasPanelProps {
  data: BuilderCanvasPanelViewData
  onAction: (action: FlowBuilderCanvasAction) => void
  // ReactFlow high-frequency handlers (separate from onAction for performance)
  onNodesChange: OnNodesChange<Node<BuilderNodeData>>
  onEdgesChange: OnEdgesChange<Edge>
  onConnect: (connection: Connection) => void
}

const nodeTypes = { builder: BuilderNodeComponent, state: StateNodeComponent }

export const BuilderCanvasPanel = React.memo(function BuilderCanvasPanel({
  data,
  onAction,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: BuilderCanvasPanelProps) {
  const { nodes, edges, canAddStep, workflowStateFields, pipelineStateFields, stateLinksCountByNodeId } = data

  const [pinnedStateNodePosition, setPinnedStateNodePosition] = useState<{ x: number; y: number } | null>(null)
  const colorMode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  const orderedBuilderNodes = useMemo(() => sortBuilderNodes(nodes, edges), [edges, nodes])
  const startNodeId = orderedBuilderNodes[0]?.id
  const endNodeId = orderedBuilderNodes[orderedBuilderNodes.length - 1]?.id
  const orderByNodeId = useMemo(() => buildOrderByNodeId(orderedBuilderNodes), [orderedBuilderNodes])
  const onDeleteStage = (nodeId: string, stage: string) => onAction({ type: 'requestDeleteStage', nodeId, stage })
  const builderNodesWithFlowRole = useMemo(
    () =>
      buildBuilderNodesWithFlowRole(
        nodes,
        startNodeId,
        endNodeId,
        orderByNodeId,
        stateLinksCountByNodeId,
        onDeleteStage,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endNodeId, nodes, orderByNodeId, startNodeId, stateLinksCountByNodeId],
  )
  const shouldShowStateNode = workflowStateFields > 0
  const defaultStateNodePosition = useMemo(() => buildDefaultStateNodePosition(orderedBuilderNodes), [orderedBuilderNodes])
  const effectiveStateNodePosition = pinnedStateNodePosition ?? defaultStateNodePosition
  const stateNode = useMemo<Node<StateNodeData>>(
    () => buildStateNode(effectiveStateNodePosition, workflowStateFields, pipelineStateFields, () => onAction({ type: 'openWorkflowStateEditor' })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveStateNodePosition, workflowStateFields, pipelineStateFields],
  )
  const canvasNodes = useMemo(
    () =>
      shouldShowStateNode
        ? ([stateNode, ...builderNodesWithFlowRole] as Node[]) // SAFETY: array elements are typed BuilderNodeData nodes which extend Node
        : (builderNodesWithFlowRole as Node[]), // SAFETY: array elements are typed BuilderNodeData nodes which extend Node
    [shouldShowStateNode, stateNode, builderNodesWithFlowRole],
  )
  const baseEdges = useMemo(() => filterBaseEdges(edges), [edges])
  const stateReferenceEdges = useMemo(() => {
    if (!shouldShowStateNode) {
      return [] as Edge[] // SAFETY: empty array needs explicit Edge[] type for ReactFlow
    }
    return buildStateReferenceEdges(orderedBuilderNodes, stateLinksCountByNodeId)
  }, [orderedBuilderNodes, shouldShowStateNode, stateLinksCountByNodeId])
  const canvasEdges = useMemo(() => [...baseEdges, ...stateReferenceEdges], [baseEdges, stateReferenceEdges])

  const handleNodesChange = (changes: NodeChange[]) => {
    changes.forEach((change) => {
      const positionChange = change as { id?: string; type?: string; position?: { x: number; y: number } } // SAFETY: ReactFlow position change shape accessed for drag handling
      if (positionChange.id === WORKFLOW_STATE_NODE_ID && positionChange.type === 'position' && positionChange.position) {
        setPinnedStateNodePosition(positionChange.position)
      }
    })
    const filtered = filterNodeChangesWithoutStateNode(changes)
    if (filtered.length === 0) {
      return
    }
    onNodesChange(filtered as NodeChange<Node<BuilderNodeData>>[]) // SAFETY: filtered subset of NodeChange array retains original element types
  }

  const handleEdgesChange = (changes: EdgeChange[]) => {
    const filtered = filterEdgeChangesWithoutStateRef(changes)
    if (filtered.length === 0) {
      return
    }
    onEdgesChange(filtered as EdgeChange<Edge>[]) // SAFETY: filtered subset of EdgeChange array retains original element types
  }

  const handleConnectSafe = (connection: Connection) => {
    if (isStateNodeConnection(connection)) {
      return
    }
    onConnect(connection)
  }

  return (
    <section className={FB_LAYOUT.canvas}>
      <BuilderCanvasHeader
        onAddStep={() => onAction({ type: 'openAddStepModal' })}
        onReset={() => onAction({ type: 'resetBuilder' })}
        canAddStep={canAddStep}
      />

      <div className={`${FB_LAYOUT.flowWrap} builder-flow-wrap`}>
        <ReactFlow
          colorMode={colorMode}
          nodes={canvasNodes}
          edges={canvasEdges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnectSafe}
          onSelectionChange={({ nodes: selectedNodes }) => {
            const selectedId = selectedNodes[0]?.id ?? null
            if (selectedId === WORKFLOW_STATE_NODE_ID) {
              onAction({ type: 'nodeSelected', nodeId: null })
              return
            }
            onAction({ type: 'nodeSelected', nodeId: selectedId })
          }}
          onNodeDoubleClick={(_, node) => {
            if (node.id === WORKFLOW_STATE_NODE_ID) {
              onAction({ type: 'openWorkflowStateEditor' })
              return
            }
            onAction({ type: 'nodeDoubleClicked', nodeId: node.id })
          }}
          fitView
        >
          <Background color="var(--flow-grid)" gap={22} />
          <MiniMap zoomable pannable />
          <Controls />
        </ReactFlow>
      </div>
    </section>
  )
})
