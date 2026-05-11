/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useCallback } from 'react'
import { KeyModeInput } from '../../../../../shared/components/KeyModeInput'
import type { KeyValue } from '../../../../../shared/types/key-value.types'
import type { DispatchKafkaEnvelopeCardProps } from '../../../types/messageDispatch.view.types'

export const DispatchKafkaEnvelopeCard = React.memo(function DispatchKafkaEnvelopeCard({
  labels,
  isVisible,
  isSending,
  kafkaKeyRaw,
  kafkaKeyKind,
  kafkaHeadersRows,
  onKafkaKeyChange,
  onKafkaKeyKindChange,
  onKafkaHeaderChange,
  onAddKafkaHeaderRow,
  onRemoveKafkaHeaderRow,
}: DispatchKafkaEnvelopeCardProps) {
  const handleKeyChange = useCallback((kv: KeyValue) => {
    if (kv.kind !== kafkaKeyKind) {
      onKafkaKeyKindChange(kv.kind)
    }
    onKafkaKeyChange(kv.value)
  }, [kafkaKeyKind, onKafkaKeyChange, onKafkaKeyKindChange])

  if (!isVisible) {
    return null
  }

  return (
    <>
      <div className="dispatch-label dispatch-kafka-key">
        <label className="dispatch-kafka-key-head" htmlFor="dispatch-kafka-key-input">{labels.kafkaKey}</label>
        <KeyModeInput
          inputId="dispatch-kafka-key-input"
          modeGroupLabel={labels.kafkaKey}
          value={{ kind: kafkaKeyKind, value: kafkaKeyRaw }}
          onChange={handleKeyChange}
          disabled={isSending}
        />
      </div>

      <div className="dispatch-kafka-headers-inline">
        <div className="dispatch-kafka-headers-inline-head">
          <strong>{labels.headers}</strong>
        </div>
        <div className="dispatch-kafka-headers-list">
          {kafkaHeadersRows.map((row, index) => (
            <div key={row.id} className="dispatch-kafka-header-row">
              <input
                className="dispatch-kafka-field-input"
                value={row.key}
                onChange={(event) => onKafkaHeaderChange(row.id, 'key', event.target.value)}
                placeholder={labels.headerKeyPlaceholder}
                disabled={isSending}
                aria-label={labels.headerKeyAria}
              />
              <input
                className="dispatch-kafka-field-input"
                value={row.value}
                onChange={(event) => onKafkaHeaderChange(row.id, 'value', event.target.value)}
                placeholder={labels.headerValuePlaceholder}
                disabled={isSending}
                aria-label={labels.headerValueAria}
              />
              <div className="dispatch-kafka-row-actions">
                <button
                  type="button"
                  className="runs-cta dispatch-kafka-action-btn is-remove"
                  onClick={() => onRemoveKafkaHeaderRow(row.id)}
                  disabled={isSending}
                  aria-label={labels.removeHeaderAria}
                >
                  <span className="dispatch-kafka-action-glyph">X</span>
                </button>
                {index === 0 ? (
                  <button
                    type="button"
                    className="runs-cta dispatch-kafka-action-btn is-add"
                    onClick={onAddKafkaHeaderRow}
                    disabled={isSending}
                    aria-label={labels.addHeaderAria}
                  >
                    <span className="dispatch-kafka-action-glyph">+</span>
                  </button>
                ) : (
                  <span className="dispatch-kafka-action-placeholder" aria-hidden="true" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
})
