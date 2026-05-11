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
import { FB_STATE_NODE } from '../../ui/ui-classes'
import type { StateNodeData } from '../../types'

const STATE_SOURCE_HANDLE_POSITIONS = [14, 24, 34, 44, 50, 56, 66, 76, 86]

export function StateNodeComponent({ data, selected }: NodeProps<Node<StateNodeData>>) {
  const { t } = useI18n()
  const labels = {
    fields: t('flow.stateNode.fields'),
    usedInPipeline: t('flow.stateNode.usedInPipeline'),
    openEditor: t('flow.stateNode.openEditor'),
  }
  return (
    <div className={`${FB_STATE_NODE.root} ${selected ? FB_STATE_NODE.rootSelected : ''}`}>
      <div className={FB_STATE_NODE.top}>
        <strong>{data.title}</strong>
        <span className={FB_STATE_NODE.topSpan}>{data.totalStateFields} {labels.fields}</span>
      </div>
      <p className={FB_STATE_NODE.meta}>{labels.usedInPipeline}: {data.pipelineStateFields}</p>
      <button
        type="button"
        className={FB_STATE_NODE.addBtn}
        onClick={data.onOpenEditor}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {labels.openEditor}
      </button>
      {STATE_SOURCE_HANDLE_POSITIONS.map((leftPercent, index) => (
        <Handle
          key={`state-hub-source-${index}`}
          id={`state-hub-source-${index}`}
          type="source"
          position={Position.Bottom}
          className={`${FB_STATE_NODE.handle} ${FB_STATE_NODE.handleSource} ${
            index === 4 ? FB_STATE_NODE.handleSourcePrimary : FB_STATE_NODE.handleSourceRouting
          }`}
          style={{ left: `${leftPercent}%` }}
          isConnectable={false}
        />
      ))}
    </div>
  )
}
