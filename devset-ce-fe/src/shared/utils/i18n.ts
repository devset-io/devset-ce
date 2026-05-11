/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

/** Resolves UI locale from localStorage or document lang attribute. */
export const resolveLocale = (): 'pl' | 'en' => {
  if (typeof window === 'undefined') {
    return 'en'
  }
  const saved = window.localStorage.getItem('devset.locale')
  if (saved === 'pl' || saved === 'en') {
    return saved
  }
  return document.documentElement.lang === 'pl' ? 'pl' : 'en'
}

/** Returns localized string based on current locale. */
export const msg = (pl: string, en: string): string => (resolveLocale() === 'pl' ? pl : en)
