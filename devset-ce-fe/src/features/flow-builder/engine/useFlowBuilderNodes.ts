/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { addEdge, MarkerType, type Connection, useEdgesState, useNodesState } from '@xyflow/react'
import { useRef, useState } from 'react'
import { orderNodesByConnections } from '../config/node-palette.config'
import type { BuilderEdge, BuilderNode } from '../types'

// ──────────────────────────────────────────────────────────────
// useFlowBuilderNodes
//
// Domain hook that owns the graph topology: nodes (pipeline
// steps), edges (connections between them), and which node the
// user has selected.
//
// It does NOT own operations that also touch overrides (like
// adding/removing a step) – those live in the composition hook
// (useFlowBuilderState) because they need to coordinate
// multiple domain hooks at once.
//
// The hook exposes low-level setters (setNodes, setEdges) so
// that the composition hook can orchestrate cross-domain actions.
//
// Returns:
//   nodes / edges       – current graph data (consumed by ReactFlow)
//   selectedId / selectedNode – which node the user clicked
//   sortedNodes          – nodes ordered by edge connections (for pipeline order)
//   onNodesChange / onEdgesChange – ReactFlow drag & delete handlers
//   handleConnect        – called when the user draws a new edge
//   setNodes / setEdges  – raw setters for cross-domain coordination
//   counterRef           – mutable counter for generating unique step IDs
// ──────────────────────────────────────────────────────────────

export function useFlowBuilderNodes(initialNodes: BuilderNode[], initialEdges: BuilderEdge[], initialCounter: number) {
  // ReactFlow state hooks – they return [value, setter, changeHandler].
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // ID of the node the user selected (clicked) on the canvas. null = nothing selected.
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Auto-increment counter used to generate unique IDs like "step_1", "step_2", etc.
  // Stored as a ref (not state) because changing it should NOT trigger a re-render.
  const counterRef = useRef(initialCounter)

  // Derived: find the full node object for the selected ID.
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null

  // Derived: nodes sorted by how they are connected (topological order).
  // This determines the pipeline execution order.
  const sortedNodes = orderNodesByConnections(nodes, edges)

  // Called when the user draws a new edge between two nodes on the canvas.
  // Enforces a linear pipeline: each node can have at most one outgoing
  // and one incoming edge, so we remove conflicting edges first.
  const handleConnect = (connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return
    }
    setEdges((current) => {
      // Remove any existing edges that would create a branch
      // (only one outgoing per source, one incoming per target).
      const linearized = current.filter(
        (edge) =>
          edge.source !== connection.source &&
          edge.target !== connection.target &&
          !(edge.source === connection.source && edge.target === connection.target),
      )
      return addEdge(
        {
          ...connection,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#2b8a66', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#2b8a66' },
        },
        linearized,
      )
    })
  }

  return {
    nodes,
    edges,
    selectedId,
    selectedNode,
    sortedNodes,
    onNodesChange,
    onEdgesChange,
    handleConnect,
    setSelectedId,
    setNodes,
    setEdges,
    counterRef,
  }
}
