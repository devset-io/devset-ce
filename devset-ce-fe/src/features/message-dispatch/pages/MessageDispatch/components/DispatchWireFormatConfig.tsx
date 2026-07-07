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
import { FB_UI } from '../../../../flow-builder/ui/ui-classes'
import type {
  DispatchRequestCardLabels,
  DispatchWireFormatViewModel,
} from '../../../types/messageDispatch.view.types'
import type { ContentMode } from '../../../types/messageDispatch.types'

interface DispatchWireFormatConfigProps {
  labels: DispatchRequestCardLabels
  contentMode: ContentMode
  isSending: boolean
  isProtoPayloadEnabled: boolean
  isProtoEditingBlocked: boolean
  wireFormat: DispatchWireFormatViewModel
  onWireFormatEnabledChange: (enabled: boolean) => void
  onWireFormatSourceChange: () => void
  onWireFormatPrefixValueChange: (value: string) => void
}

export const DispatchWireFormatConfig = React.memo(function DispatchWireFormatConfig({
  labels,
  contentMode,
  isSending,
  isProtoPayloadEnabled,
  isProtoEditingBlocked,
  wireFormat,
  onWireFormatEnabledChange,
  onWireFormatSourceChange,
  onWireFormatPrefixValueChange,
}: DispatchWireFormatConfigProps) {
  if (contentMode !== 'protobuf') return null

  return (
    <section className="mb-3 rounded-lg border border-[var(--line-300)] bg-[var(--panel-soft)] p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h4 className="m-0 text-sm font-semibold text-slate-800">
            {labels.wireFormatTitle}
          </h4>
          <span className="group relative inline-flex">
            <button
              type="button"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-600"
              aria-label={labels.wireFormatTooltipAria}
            >
              i
            </button>
            <span className="pointer-events-none absolute left-0 top-5 z-20 hidden w-[320px] rounded-lg border border-slate-200 bg-white p-2 text-[11px] leading-4 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.16)] group-hover:block group-focus-within:block">
              {labels.wireFormatTooltip}
            </span>
          </span>
        </div>
      </div>

      <label className={`${FB_UI.label} mb-2 flex items-center gap-2`}>
        <input
          type="checkbox"
          checked={wireFormat.enabled}
          onChange={(event) => onWireFormatEnabledChange(event.target.checked)}
          disabled={isSending || !isProtoPayloadEnabled || isProtoEditingBlocked}
        />
        <span>{labels.wireFormatEnable}</span>
      </label>

      {wireFormat.enabled ? (
        <label className={`${FB_UI.label} mb-2 block`}>
          {labels.wireFormatSource}
          <select
            className={FB_UI.input}
            value={wireFormat.prefixSource}
            onChange={onWireFormatSourceChange}
            disabled={isSending || !isProtoPayloadEnabled || isProtoEditingBlocked}
          >
            <option value="messagePrefix">
              {labels.wireFormatSourceMessagePrefix}
            </option>
          </select>
        </label>
      ) : null}

      {wireFormat.enabled ? (
        <label className={`${FB_UI.label} block`}>
          {labels.wireFormatPrefixValue}
          <input
            className={FB_UI.input}
            type="number"
            min={0}
            max={65535}
            step={1}
            value={wireFormat.prefixValue}
            onChange={(event) => onWireFormatPrefixValueChange(event.target.value)}
            disabled={isSending || !isProtoPayloadEnabled || isProtoEditingBlocked}
            placeholder="0..65535"
          />
          {wireFormat.prefixValueError ? (
            <span className="mt-1 block text-xs text-red-700">
              {labels.wireFormatPrefixValueError}
            </span>
          ) : null}
        </label>
      ) : null}

      <p className={`${FB_UI.hint} mt-2`}>{labels.wireFormatHint}</p>
    </section>
  )
})
