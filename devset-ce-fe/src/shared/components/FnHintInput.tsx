/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useMemo } from 'react'
import { useI18n } from '../../core/i18n/I18nProvider'
import { FUNCTION_CATALOG } from '../../features/flow-builder/config/function-catalog'
import { HintInput } from './HintInput'
import type { HintItem } from './HintInput'

interface FnHintInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onChange: (value: string) => void
}

/** Input with function autocomplete from the function catalog. */
export const FnHintInput = React.memo(function FnHintInput({ value, onChange, ...inputProps }: FnHintInputProps) {
  const { t } = useI18n()

  const items: HintItem[] = useMemo(
    () => FUNCTION_CATALOG.map((fn) => ({ value: fn.example, label: fn.name, detail: t(fn.hint) })),
    [t],
  )

  return <HintInput value={value} onChange={onChange} items={items} {...inputProps} />
})
