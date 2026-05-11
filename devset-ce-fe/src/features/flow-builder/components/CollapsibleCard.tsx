/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { type ReactNode } from 'react'
import { FB_UI } from '../ui/ui-classes'

type CollapsibleCardProps = {
  title: string
  open?: boolean
  onToggle?: (nextOpen: boolean) => void
  children: ReactNode
}

export const CollapsibleCard = React.memo(function CollapsibleCard({ title, open = false, onToggle, children }: CollapsibleCardProps) {
  return (
    <section
      className={`${FB_UI.card} shrink-0 overflow-hidden border-[var(--brand-border)] p-0 transition-shadow ${
        open ? 'shadow-[0_8px_24px_rgba(17,51,34,0.08)]' : ''
      }`}
    >
      <button
        type="button"
        className={`flex w-full cursor-pointer list-none items-center justify-between border-b border-transparent bg-white px-3 py-3 font-semibold text-slate-800 transition hover:bg-[var(--brand-soft)]/45 ${
          open ? 'border-[var(--brand-border)] bg-[var(--brand-soft)]/55' : ''
        }`}
        onClick={() => onToggle?.(!open)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--brand-border)] bg-white text-xs text-[var(--brand-ink)] transition ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {open ? <div className="flex flex-col gap-2 p-3">{children}</div> : null}
    </section>
  )
})
