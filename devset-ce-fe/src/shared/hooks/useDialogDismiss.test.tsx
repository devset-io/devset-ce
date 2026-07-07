/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useDialogDismiss } from './useDialogDismiss.ts'

// React requires this flag for act() outside of react-dom/test-utils
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type ProbeProps = {
  active: boolean
  onDismiss: () => void
  closeOnOutsideClick?: boolean
}

function Probe({ active, onDismiss, closeOnOutsideClick }: ProbeProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogDismiss(dialogRef, active, onDismiss, { closeOnOutsideClick })
  return (
    <div>
      <div ref={dialogRef}>
        <button type="button" id="inner">inner</button>
      </div>
      <button type="button" id="outer">outer</button>
    </div>
  )
}

let container: HTMLDivElement | null = null
let root: Root | null = null

function mount(props: ProbeProps) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(<Probe {...props} />))
}

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  container = null
  root = null
})

const pressKey = (target: Element, key: string) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })

const mouseDown = (target: Element) =>
  act(() => {
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

const byId = (id: string) => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`missing element #${id}`)
  return el
}

describe('useDialogDismiss escape handling', () => {
  it('dismisses on Escape when focus is inside the dialog', () => {
    const onDismiss = vi.fn()
    mount({ active: true, onDismiss })
    pressKey(byId('inner'), 'Escape')
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape coming from outside the dialog (stacked modals)', () => {
    const onDismiss = vi.fn()
    mount({ active: true, onDismiss })
    pressKey(byId('outer'), 'Escape')
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('ignores other keys', () => {
    const onDismiss = vi.fn()
    mount({ active: true, onDismiss })
    pressKey(byId('inner'), 'Enter')
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('does nothing while inactive', () => {
    const onDismiss = vi.fn()
    mount({ active: false, onDismiss })
    pressKey(byId('inner'), 'Escape')
    expect(onDismiss).not.toHaveBeenCalled()
  })
})

describe('useDialogDismiss outside click handling', () => {
  it('dismisses on pointer-down outside when enabled', () => {
    const onDismiss = vi.fn()
    mount({ active: true, onDismiss, closeOnOutsideClick: true })
    mouseDown(byId('outer'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('keeps the dialog open on pointer-down inside', () => {
    const onDismiss = vi.fn()
    mount({ active: true, onDismiss, closeOnOutsideClick: true })
    mouseDown(byId('inner'))
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('ignores outside pointer-down when the option is disabled', () => {
    const onDismiss = vi.fn()
    mount({ active: true, onDismiss })
    mouseDown(byId('outer'))
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
