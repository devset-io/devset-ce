/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { expect, test } from '@playwright/test'
import {
  DEBOUNCE_BUFFER_MS,
  DSL_EDITOR_LABEL,
  makeCleanupBag,
  openFunctionStudio,
  openFunctionStudioDsl,
  runCleanup,
  seedWorkflow,
  setAceBody,
} from './helpers/function-studio'

// Lifecycle coverage: header chrome (which buttons show when), mode toggle
// (Function Task ↔ Raw DSL), Escape behaviour, and discard-modal escape
// hatches. These are the "frame" interactions around the panel content.
test.describe.configure({ mode: 'serial' })

const bag = makeCleanupBag()
test.afterEach(async ({ request }) => { await runCleanup(request, bag) })

test('Save and Reset are hidden whenever pendingOps is empty', async ({ page, request }) => {
  // Initial open of a clean stage means pendingOps is []. The header keeps
  // the layout calm by not rendering Save/Reset at all (vs rendering them
  // disabled) — that gates the entire "did I make a change?" UX.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-lc-empty')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  await expect(dialog.getByTestId('fn-studio-save')).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Reset' })).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible()
})

test('Close with no pending state closes the drawer without prompting', async ({ page, request }) => {
  // requestClose short-circuits to onClose() when pendingOps.length === 0.
  // The discard modal would be noise here — it must NOT appear.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-lc-close-clean')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Unsaved changes' })).toHaveCount(0)
})

test('Escape with no pending state closes the drawer directly', async ({ page, request }) => {
  // Mirror of the previous test for the keyboard escape hatch. Same gate
  // (pendingOps empty), same expected outcome.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-lc-esc-clean')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Unsaved changes' })).toHaveCount(0)
})

test('Escape with pending changes opens the discard modal', async ({ page, request }) => {
  // Symmetric with the Close button's discard prompt — Escape should route
  // through the same requestClose action and end up with the modal up.
  // Catches a regression where the drawer-level keydown handler bypasses
  // the dispatch chain.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-lc-esc-dirty')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  await setAceBody(page, DSL_EDITOR_LABEL, '{"unsaved":true}')
  await expect(dialog.getByTestId('fn-studio-save')).toBeVisible({ timeout: DEBOUNCE_BUFFER_MS + 1500 })

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Unsaved changes' })).toBeVisible()
  await expect(dialog).toBeVisible()
})

test('Escape inside the discard modal closes only the modal (cancel branch)', async ({ page, request }) => {
  // ModalShell's onClose runs on Escape (see ModalShell.tsx:51), which the
  // discard modal wires to onCancel. The drawer must stay open with its
  // pending state intact — same outcome as the Back button.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-lc-modal-esc')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  await setAceBody(page, DSL_EDITOR_LABEL, '{"unsaved":true}')
  await expect(dialog.getByTestId('fn-studio-save')).toBeVisible({ timeout: DEBOUNCE_BUFFER_MS + 1500 })

  await dialog.getByRole('button', { name: 'Close' }).click()
  const discard = page.getByRole('dialog', { name: 'Unsaved changes' })
  await expect(discard).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(discard).toHaveCount(0)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByTestId('fn-studio-save')).toBeVisible()
})

test('editor mode toggle exposes aria-pressed for the active mode', async ({ page, request }) => {
  // The two pills ("Function Task" / "Raw DSL") are a one-of-N selector.
  // aria-pressed is the canonical hook for screen readers AND for tests
  // — if it drifts from the actual mode the user sees, both lose.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-lc-mode')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  const fnPill = dialog.getByRole('button', { name: 'Function Task' })
  const dslPill = dialog.getByRole('button', { name: 'Raw DSL' })

  await expect(fnPill).toHaveAttribute('aria-pressed', 'true')
  await expect(dslPill).toHaveAttribute('aria-pressed', 'false')

  await dslPill.click()
  await expect(fnPill).toHaveAttribute('aria-pressed', 'false')
  await expect(dslPill).toHaveAttribute('aria-pressed', 'true')

  await fnPill.click()
  await expect(fnPill).toHaveAttribute('aria-pressed', 'true')
  await expect(dslPill).toHaveAttribute('aria-pressed', 'false')
})

test('switching mode back and forth preserves a pending dsl-raw draft', async ({ page, request }) => {
  // The dsl-raw op lives in the reducer (not in the panel's local state),
  // so it must survive the DSL panel unmount/remount that comes with mode
  // toggling. Otherwise the user would lose work just by clicking the
  // wrong pill.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-lc-mode-persist')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  await setAceBody(page, DSL_EDITOR_LABEL, JSON.stringify({ keep_me: true }, null, 2))
  await expect(dialog.getByTestId('dsl-pending-badge')).toBeVisible({ timeout: DEBOUNCE_BUFFER_MS + 1500 })
  await expect(dialog.getByTestId('fn-studio-save')).toBeVisible()

  // Function Task → unmounts the DSL editor. Save must still be there
  // because pendingOps wasn't touched.
  await dialog.getByRole('button', { name: 'Function Task' }).click()
  await expect(dialog.getByTestId('fn-studio-save')).toBeVisible()

  // Back to Raw DSL → editor remounts. The badge re-renders from the
  // surviving dsl-raw op in pendingOps.
  await dialog.getByRole('button', { name: 'Raw DSL' }).click()
  await expect(dialog.getByTestId('dsl-pending-badge')).toBeVisible()
})
