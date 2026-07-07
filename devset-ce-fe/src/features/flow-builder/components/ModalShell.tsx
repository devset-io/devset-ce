/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect, useId, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useI18n } from '../../../core/i18n/I18nProvider'
import { useFocusTrap } from '../../../shared/hooks/useFocusTrap'
import { FB_UI } from '../ui/ui-classes'

type ModalShellProps = {
  isOpen: boolean
  title: string
  subtitle: string
  onClose: () => void
  zIndexClassName: string
  containerClassName: string
  containerStyle?: CSSProperties
  children: ReactNode
}

export function ModalShell({
  isOpen,
  title,
  subtitle,
  onClose,
  zIndexClassName,
  containerClassName,
  containerStyle,
  children,
}: ModalShellProps) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useFocusTrap(dialogRef, isOpen)

  useEffect(() => {
    if (!isOpen) return
    const controller = new AbortController()
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape') onClose()
      },
      { signal: controller.signal },
    )
    return () => controller.abort()
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div className={`${FB_UI.modalBackdrop} ${zIndexClassName}`}>
      <div
        ref={dialogRef}
        className={`${FB_UI.modalCard} ${containerClassName}`}
        style={containerStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h3 id={titleId} className="m-0 text-base font-semibold text-slate-800">{title}</h3>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          <button type="button" className={FB_UI.secondaryButton} onClick={onClose}>
            {t('flow.modal.close')}
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
