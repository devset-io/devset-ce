/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useMemo } from 'react'
import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { DslPayload } from '../../flow-builder/types'
import type { WorkflowPreviewGraphLabels } from '../types/workflowRuns.view.types'
import { formatKeyValueDisplay } from '../../../shared/types/key-value.types'
import { buildWorkflowWithOverrides, EMPTY_KEY, type HeaderRow, type KeyValue, stripStateFromWorkflow } from '../workflow-runs.utils'

type UseWorkflowPreviewGraphParams = {
  selectedWorkflowDsl: DslPayload | null
  topicRaw: string
  headerRowsByStageIndex: Record<number, HeaderRow[]>
  keyByStageIndex: Record<number, KeyValue>
  showKafkaParams: boolean
  onEditParamsStage: (index: number) => void
  labels: WorkflowPreviewGraphLabels
}

/** Builds a ReactFlow graph from a workflow DSL for preview display. */
export function useWorkflowPreviewGraph({
  selectedWorkflowDsl,
  topicRaw,
  headerRowsByStageIndex,
  keyByStageIndex,
  showKafkaParams,
  onEditParamsStage,
  labels,
}: UseWorkflowPreviewGraphParams): { nodes: Node[]; edges: Edge[] } {
  return useMemo(() => {
    const withOverrides = selectedWorkflowDsl
      ? buildWorkflowWithOverrides(selectedWorkflowDsl, topicRaw, headerRowsByStageIndex, keyByStageIndex)
      : null
    const stripped = withOverrides ? stripStateFromWorkflow(withOverrides) : null
    if (!stripped) {
      return { nodes: [], edges: [] }
    }

    const maxParamsLines = showKafkaParams
      ? stripped.pipeline.reduce((max, _, index) => {
          const rows = headerRowsByStageIndex[index] ?? []
          const kv = keyByStageIndex[index] ?? EMPTY_KEY
          const visible = rows.filter((row) => row.key.trim()).slice(0, 3)
          const hidden = Math.max(rows.filter((row) => row.key.trim()).length - visible.length, 0)
          const lines = (kv.value.trim() ? 1 : 0) + visible.length + (hidden > 0 ? 1 : 0)
          return Math.max(max, lines)
        }, 0)
      : 0
    const stageY = showKafkaParams ? 190 + maxParamsLines * 24 : 120

    const nodes: Node[] = stripped.pipeline.flatMap((stage, index) => {
      const stageNodeId = `preview-stage-${index}`
      const paramsNodeId = `preview-params-${index}`
      const headerRows = headerRowsByStageIndex[index] ?? []
      const stageKeyValue = keyByStageIndex[index] ?? EMPTY_KEY
      const visibleHeaders = headerRows.filter((row) => row.key.trim()).slice(0, 3)
      const hiddenHeadersCount = Math.max(headerRows.filter((row) => row.key.trim()).length - visibleHeaders.length, 0)
      const x = 60 + index * 320

      const stageNode: Node = {
        id: stageNodeId,
        position: { x, y: stageY },
        draggable: false,
        data: {
          label: (
            <div className="runs-flow-node">
              <strong>{stage.stage}</strong>
              <span>{stage.event}</span>
              <span>emit: {typeof stage.emit === 'object' ? '$fn' : String(stage.emit)}</span>
            </div>
          ),
        },
        style: {
          borderRadius: 12,
          border: '1px solid #bfd1ec',
          background: '#fff',
          minWidth: 230,
          boxShadow: '0 6px 16px rgba(40,61,95,0.12)',
        },
      }

      if (!showKafkaParams) {
        return [stageNode]
      }

      return [
        {
          id: paramsNodeId,
          position: { x, y: 30 },
          draggable: false,
          data: {
            label: (
              <div className="runs-flow-params-node">
                <div className="runs-flow-params-head">
                  <strong>{labels.kafkaParams}</strong>
                </div>
                {stageKeyValue.value.trim() ? (
                  <span className="runs-flow-params-item"><strong>key:</strong> {formatKeyValueDisplay(stageKeyValue)}</span>
                ) : null}
                <span className="runs-flow-params-hint">{labels.headersCount}: {headerRows.filter((row) => row.key.trim()).length}</span>
                {visibleHeaders.length > 0 ? (
                  <div className="runs-flow-params-list">
                    {visibleHeaders.map((row) => (
                      <span key={row.id} className="runs-flow-params-item">
                        {row.key}: {row.value || '""'}
                      </span>
                    ))}
                    {hiddenHeadersCount > 0 ? (
                      <span className="runs-flow-params-item runs-flow-params-more">+{hiddenHeadersCount} {labels.more}</span>
                    ) : null}
                  </div>
                ) : (
                  <span className="runs-flow-params-hint">{labels.noHeaders}</span>
                )}
                <button
                  type="button"
                  className="runs-flow-params-edit-btn"
                  onClick={(event) => {
                    event.stopPropagation()
                    onEditParamsStage(index)
                  }}
                >
                  {labels.editHeaders}
                </button>
              </div>
            ),
          },
          style: {
            borderRadius: 12,
            border: '1px solid #c8d6ec',
            background: '#f7fbff',
            minWidth: 260,
            boxShadow: '0 6px 16px rgba(40,61,95,0.08)',
            cursor: 'pointer',
          },
        },
        stageNode,
      ]
    })

    const stageEdges: Edge[] = stripped.pipeline.slice(1).map((_, index) => ({
      id: `preview-edge-stage-${index}`,
      source: `preview-stage-${index}`,
      target: `preview-stage-${index + 1}`,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#2b8a66' },
      style: { stroke: '#2b8a66', strokeWidth: 2 },
      animated: false,
    }))

    const paramsEdges: Edge[] = showKafkaParams
      ? stripped.pipeline.map((_, index) => ({
          id: `preview-edge-params-${index}`,
          source: `preview-params-${index}`,
          target: `preview-stage-${index}`,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7f9a' },
          style: { stroke: '#9aa9bd', strokeWidth: 1.5, strokeDasharray: '6 6' },
          animated: false,
        }))
      : []

    return { nodes, edges: [...stageEdges, ...paramsEdges] }
  }, [
    headerRowsByStageIndex,
    keyByStageIndex,
    labels.editHeaders,
    labels.headersCount,
    labels.kafkaParams,
    labels.more,
    labels.noHeaders,
    onEditParamsStage,
    selectedWorkflowDsl,
    showKafkaParams,
    topicRaw,
  ])
}
