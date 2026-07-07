/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useEffect } from 'react'
import type { RefObject } from 'react'

type DialogDismissOptions = {
  /** Also dismiss when the pointer goes down outside the dialog. */
  closeOnOutsideClick?: boolean
}

/**
 * Dismisses a dialog on Escape and, optionally, on pointer-down outside of it.
 *
 * <p>Escape is honored only while focus is inside the dialog, so stacked modals
 * close one at a time — focus traps keep focus in the topmost dialog.</p>
 */
export function useDialogDismiss(
  dialogRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  onDismiss: () => void,
  options?: DialogDismissOptions,
): void {
  const closeOnOutsideClick = options?.closeOnOutsideClick ?? false

  useEffect(() => {
    if (!isActive) return
    const controller = new AbortController()
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Escape') return
        if (dialogRef.current && e.target instanceof Node && !dialogRef.current.contains(e.target)) return
        onDismiss()
      },
      { signal: controller.signal },
    )
    if (closeOnOutsideClick) {
      window.addEventListener(
        'mousedown',
        (e) => {
          if (dialogRef.current && e.target instanceof Node && !dialogRef.current.contains(e.target)) onDismiss()
        },
        { signal: controller.signal },
      )
    }
    return () => controller.abort()
  }, [dialogRef, isActive, onDismiss, closeOnOutsideClick])
}
