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

export const StepBadge = React.memo(function StepBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] text-[10.5px] font-extrabold text-[var(--brand-ink)]">
      {n}
    </span>
  )
})
