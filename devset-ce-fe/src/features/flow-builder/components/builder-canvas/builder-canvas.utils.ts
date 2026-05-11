/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { Position, type Connection, type Edge, type EdgeChange, type Node, type NodeChange } from '@xyflow/react'

import type { BuilderNodeData, StateNodeData } from '../../types'
import {orderNodesByConnections} from "../../config/node-palette.config.ts";

export const WORKFLOW_STATE_NODE_ID = 'workflow-state'
export const STATE_REF_EDGE_PREFIX = 'state-ref-link-'
const NODE_VISUAL_WIDTH = 242
const STATE_TOP_GAP = 180
const STATE_MIN_Y = 16
const STATE_SOURCE_HANDLE_COUNT = 9

export const sortBuilderNodes = (nodes: Node<BuilderNodeData>[], edges: Edge[]) =>
  orderNodesByConnections(nodes, edges)

export const buildOrderByNodeId = (orderedNodes: Node<BuilderNodeData>[]) =>
  new Map(orderedNodes.map((node, index) => [node.id, `#${index + 1}`]))

export const buildBuilderNodesWithFlowRole = (
  nodes: Node<BuilderNodeData>[],
  startNodeId: string | undefined,
  endNodeId: string | undefined,
  orderByNodeId: Map<string, string>,
  stateLinksCountByNodeId: Record<string, number>,
  onDeleteStage?: (nodeId: string, stage: string) => void,
): Node<BuilderNodeData>[] =>
  nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onDeleteStage: onDeleteStage ? () => onDeleteStage(node.id, node.data.stage) : undefined,
      isStart: node.id === startNodeId,
      isEnd: node.id === endNodeId,
      orderLabel: orderByNodeId.get(node.id),
      stateLinksCount: stateLinksCountByNodeId[node.id] ?? 0,
      hasStateLinks: (stateLinksCountByNodeId[node.id] ?? 0) > 0,
    },
  }))

export const buildDefaultStateNodePosition = (orderedBuilderNodes: Node<BuilderNodeData>[]) => {
  if (orderedBuilderNodes.length === 0) {
    return { x: 60, y: 22 }
  }

  const xs = orderedBuilderNodes.map((node) => node.position.x)
  const ys = orderedBuilderNodes.map((node) => node.position.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)

  return {
    x: Math.round((minX + maxX + NODE_VISUAL_WIDTH) / 2),
    y: Math.max(STATE_MIN_Y, Math.round(minY - STATE_TOP_GAP)),
  }
}

export const buildStateNode = (
  position: { x: number; y: number },
  workflowStateFields: number,
  pipelineStateFields: number,
  onOpenWorkflowStateEditor: () => void,
): Node<StateNodeData> => ({
  id: WORKFLOW_STATE_NODE_ID,
  type: 'state',
  draggable: true,
  selectable: true,
  position,
  data: {
    title: 'Stan workflow',
    totalStateFields: workflowStateFields,
    pipelineStateFields,
    onOpenEditor: onOpenWorkflowStateEditor,
  },
})

export const filterBaseEdges = (edges: Edge[]) =>
  edges.filter(
    (edge) =>
      !edge.id.startsWith(STATE_REF_EDGE_PREFIX) &&
      edge.className !== 'state-ref-edge' &&
      edge.source !== WORKFLOW_STATE_NODE_ID &&
      edge.target !== WORKFLOW_STATE_NODE_ID,
  )

export const buildStateReferenceEdges = (
  orderedBuilderNodes: Node<BuilderNodeData>[],
  stateLinksCountByNodeId: Record<string, number>,
): Edge[] => {
  const stateNodes = orderedBuilderNodes.filter((node) => (stateLinksCountByNodeId[node.id] ?? 0) > 0)
  if (stateNodes.length === 0) {
    return []
  }

  return stateNodes.map((node, index) => ({
    id: `${STATE_REF_EDGE_PREFIX}${WORKFLOW_STATE_NODE_ID}-${node.id}`,
    source: WORKFLOW_STATE_NODE_ID,
    target: node.id,
    sourceHandle: `state-hub-source-${index % STATE_SOURCE_HANDLE_COUNT}`,
    targetHandle: 'state-target',
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    className: 'state-ref-edge',
    type: 'smoothstep',
    animated: false,
    selectable: false,
    focusable: false,
    style: {
      stroke: '#94a3b8',
      strokeWidth: 1.5,
      strokeDasharray: '6 6',
    },
  }))
}

export const filterNodeChangesWithoutStateNode = (changes: NodeChange[]) =>
  changes.filter((change) => !('id' in change) || change.id !== WORKFLOW_STATE_NODE_ID)

export const filterEdgeChangesWithoutStateRef = (changes: EdgeChange[]) =>
  changes.filter((change) => !('id' in change) || typeof change.id !== 'string' || !change.id.startsWith(STATE_REF_EDGE_PREFIX))

export const isStateNodeConnection = (connection: Connection) =>
  connection.source === WORKFLOW_STATE_NODE_ID ||
  connection.target === WORKFLOW_STATE_NODE_ID ||
  connection.sourceHandle?.startsWith('state-') ||
  connection.targetHandle?.startsWith('state-')
