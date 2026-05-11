/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useEffect, useState } from 'react'
import { useI18n } from '../../../../../core/i18n/I18nProvider'
import type { WorkflowState, WorkflowStateValue } from '../../../types'
import { ModalShell } from '../../../components/ModalShell'
import { FB_UI } from '../../../ui/ui-classes'
import { createClientId } from '../../../../../shared/utils/create-client-id'

type WorkflowStateType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array'

const WORKFLOW_STATE_TYPES: readonly WorkflowStateType[] = ['string', 'number', 'boolean', 'null', 'object', 'array']
const isWorkflowStateType = (value: string): value is WorkflowStateType =>
  (WORKFLOW_STATE_TYPES as readonly string[]).includes(value) // SAFETY: widen to string[] so .includes() accepts string param

type WorkflowStateRow = {
  id: string
  key: string
  valueType: WorkflowStateType
}

type WorkflowStateEditorModalProps = {
  isOpen: boolean
  state: WorkflowState
  onClose: () => void
  onSave: (nextState: WorkflowState) => Promise<void> | void
}

const toDefaultValueByType = (type: WorkflowStateType): WorkflowStateValue => {
  if (type === 'number') {
    return 0
  }
  if (type === 'boolean') {
    return false
  }
  if (type === 'null') {
    return null
  }
  if (type === 'object') {
    return {}
  }
  if (type === 'array') {
    return []
  }
  return ''
}

const inferTypeFromValue = (value: unknown): WorkflowStateType => {
  if (Array.isArray(value)) {
    return 'array'
  }
  if (value === null) {
    return 'null'
  }
  if (typeof value === 'number') {
    return 'number'
  }
  if (typeof value === 'boolean') {
    return 'boolean'
  }
  if (value && typeof value === 'object') {
    return 'object'
  }
  return 'string'
}

const createEmptyRow = (key = ''): WorkflowStateRow => ({
  id: createClientId(),
  key,
  valueType: 'string',
})

export const WorkflowStateEditorModal = React.memo(function WorkflowStateEditorModal({ isOpen, state, onClose, onSave }: WorkflowStateEditorModalProps) {
  const { t } = useI18n()
  const [rows, setRows] = useState<WorkflowStateRow[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    const nextRows = Object.entries(state).map(([key, value]) => ({
      id: createClientId(),
      key,
      valueType: inferTypeFromValue(value),
    }))
    setRows(nextRows.length > 0 ? nextRows : [createEmptyRow('entity.value')])
  }, [isOpen, state])

  return (
    <ModalShell
      isOpen={isOpen}
      title={t('flow.stateModal.title')}
      subtitle={t('flow.stateModal.subtitle')}
      onClose={onClose}
      zIndexClassName="z-[45]"
      containerClassName="max-h-[86vh] max-w-[920px] gap-3"
    >
      <div className="flex flex-col gap-2 overflow-auto pr-1">
        {rows.map((row) => (
          <div key={row.id} className="grid items-center gap-2 lg:grid-cols-[minmax(180px,1fr)_minmax(160px,220px)_auto]">
            <input
              aria-label="State key"
              className={FB_UI.input}
              placeholder="entity.totalMileage"
              value={row.key}
              onChange={(event) =>
                setRows((current) => current.map((item) => (item.id === row.id ? { ...item, key: event.target.value } : item)))
              }
            />
            <select
              aria-label="State type"
              className={FB_UI.input}
              value={row.valueType}
              onChange={(event) => {
                if (!isWorkflowStateType(event.target.value)) return
                const nextType = event.target.value
                setRows((current) =>
                  current.map((item) =>
                    item.id === row.id
                      ? { ...item, valueType: nextType }
                      : item,
                  ),
                )
              }}
            >
              <option value="string">{t('flow.stateModal.type.string')}</option>
              <option value="number">{t('flow.stateModal.type.number')}</option>
              <option value="boolean">{t('flow.stateModal.type.boolean')}</option>
              <option value="null">{t('flow.stateModal.type.null')}</option>
              <option value="object">{t('flow.stateModal.type.object')}</option>
              <option value="array">{t('flow.stateModal.type.array')}</option>
            </select>
            <button
              type="button"
              className={FB_UI.secondaryButton}
              aria-label={`${t('flow.stateModal.remove')} ${row.key || ''}`}
              onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
            >
              {t('flow.stateModal.remove')}
            </button>
          </div>
        ))}
      </div>

      <footer className="flex items-center justify-between gap-2">
        <button type="button" className={FB_UI.secondaryButton} onClick={() => setRows((current) => [...current, createEmptyRow()])}>
          {t('flow.stateModal.addField')}
        </button>
        <button
          type="button"
          className={FB_UI.primaryButton}
          disabled={isSaving}
          onClick={async () => {
            const nextState: WorkflowState = {}
            rows.forEach((row) => {
              const key = row.key.trim()
              if (!key) {
                return
              }
              nextState[key] = toDefaultValueByType(row.valueType)
            })
            setIsSaving(true)
            try {
              await onSave(nextState)
              onClose()
            } finally {
              setIsSaving(false)
            }
          }}
        >
          {isSaving ? t('flow.workflow.saving') : t('flow.stateModal.save')}
        </button>
      </footer>
    </ModalShell>
  )
})
