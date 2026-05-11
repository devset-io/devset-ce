/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { useI18n } from '../../../../core/i18n/I18nProvider'
import { FB_NODE } from '../../ui/ui-classes'
import type { BuilderNodeData } from '../../types'

export function BuilderNodeComponent({ data, selected }: NodeProps<Node<BuilderNodeData>>) {
  const { t } = useI18n()
  const labels = {
    start: t('flow.builderNode.start'),
    end: t('flow.builderNode.end'),
  }
  const emitMode = data.emit && typeof data.emit === 'object' && '$fn' in data.emit ? 'fn' : data.emit === true ? 'on' : 'off'

  return (
    <div className={`${FB_NODE.root} ${selected ? FB_NODE.rootSelected : ''}`}>
      {data.onDeleteStage ? (
        <button
          type="button"
          className={`${FB_NODE.deleteBtn} nodrag`}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            data.onDeleteStage?.()
          }}
          aria-label={t('flow.inspector.delete')}
          title={t('flow.inspector.delete')}
        >
          ×
        </button>
      ) : null}
      <Handle type="target" position={Position.Left} className={`${FB_NODE.handle} ${FB_NODE.handleTarget}`} />
      <Handle
        id="state-target"
        type="target"
        position={Position.Top}
        className={`${FB_NODE.handle} ${FB_NODE.handleState} ${FB_NODE.handleStateTarget}`}
        isConnectable={false}
      />
      <div className={FB_NODE.top}>
        <div className={FB_NODE.title}>
          <span className={FB_NODE.dot} style={{ background: data.color }} aria-label={`Status: ${data.stage}`} role="img" />
          <strong className={FB_NODE.titleStrong}>{data.title}</strong>
        </div>
        <div className={FB_NODE.flags}>
          {data.isStart ? <span className={`${FB_NODE.flag} ${FB_NODE.flagStart}`}>{labels.start}</span> : null}
          {data.isEnd ? <span className={`${FB_NODE.flag} ${FB_NODE.flagEnd}`}>{labels.end}</span> : null}
          {data.orderLabel ? <span className={`${FB_NODE.flag} ${FB_NODE.flagOrder}`}>{data.orderLabel}</span> : null}
        </div>
      </div>
      <div className={FB_NODE.event}>{data.event}</div>
      <div className={FB_NODE.stage}>{data.stage}</div>
      <div className={FB_NODE.insights}>
        {data.hasQuery ? (
          <span className={`${FB_NODE.insight} ${FB_NODE.insightState}`}>
            <svg viewBox="0 0 24 24" className="mr-0.5 inline h-2.5 w-2.5" fill="none">
              <ellipse cx="12" cy="6" rx="7" ry="2.6" stroke="currentColor" strokeWidth="2" />
              <path d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" stroke="currentColor" strokeWidth="2" />
            </svg>
            query
          </span>
        ) : null}
        {(data.stateLinksCount ?? 0) > 0 ? (
          <span className={`${FB_NODE.insight} ${FB_NODE.insightState}`}>state x{data.stateLinksCount}</span>
        ) : null}
        <span className={`${FB_NODE.insight} ${FB_NODE.insightRepeat}`}>repeat x{data.repeat ?? 1}</span>
        <span className={`${FB_NODE.insight} ${FB_NODE.insightEmit} ${emitMode === 'on' ? FB_NODE.insightEmitOn : emitMode === 'off' ? FB_NODE.insightEmitOff : ''}`}>
          emit {emitMode}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className={`${FB_NODE.handle} ${FB_NODE.handleSource}`} />
    </div>
  )
}
