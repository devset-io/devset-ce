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
import { useI18n } from '../../../../../core/i18n/I18nProvider'
import { ModalShell } from '../../../../flow-builder/components/ModalShell'
import { FB_UI } from '../../../../flow-builder/ui/ui-classes'
import type { DbConnectorStatus } from '../../../../../shared/services/db-connectors.service'
import type { DbConnectorsAction } from '../state/DbConnectors.types'

interface DbConnectorDeleteModalProps {
  connectorPendingDelete: DbConnectorStatus | null
  isSubmitting: boolean
  onAction: (action: DbConnectorsAction) => void
}

/** Delete confirmation modal for db connectors. */
export const DbConnectorDeleteModal = React.memo(function DbConnectorDeleteModal({
  connectorPendingDelete,
  isSubmitting,
  onAction,
}: DbConnectorDeleteModalProps) {
  const { t } = useI18n()

  return (
    <ModalShell
      isOpen={connectorPendingDelete !== null}
      title={t('dbConnectors.confirm.deleteTitle')}
      subtitle={t('dbConnectors.confirm.deleteSubtitle').replace('{name}', connectorPendingDelete?.name ?? '')}
      onClose={() => onAction({ type: 'closeDeleteModal' })}
      zIndexClassName="z-[55]"
      containerClassName="max-w-[520px] gap-3"
    >
      <div className="settings-modal-copy">
        <p className="settings-modal-lead">{t('dbConnectors.confirm.deleteBody')}</p>
      </div>
      <footer className="flex items-center justify-end gap-2">
        <button
          type="button"
          className={FB_UI.secondaryButton}
          onClick={() => onAction({ type: 'closeDeleteModal' })}
          disabled={isSubmitting}
        >
          {t('flow.common.cancel')}
        </button>
        <button
          type="button"
          className="settings-danger-button"
          onClick={() => onAction({ type: 'confirmDelete' })}
          disabled={isSubmitting}
        >
          {isSubmitting ? t('settings.action.deleting') : t('dbConnectors.confirm.deleteAction')}
        </button>
      </footer>
    </ModalShell>
  )
})
