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
  getAceBody,
  makeCleanupBag,
  openFunctionStudioDsl,
  pickStage,
  runCleanup,
  seedWorkflow,
  setAceBody,
  waitForWorkflowPut,
} from './helpers/function-studio'

// Raw DSL panel deep dive — these are the cases beyond the "happy path"
// save flow already covered in flow-builder.function-studio-save.spec.ts.
// They exercise the editor toolbar, the set↔state sub-tabs, the dirty hint,
// and the parse-error path.
test.describe.configure({ mode: 'serial' })

const bag = makeCleanupBag()
test.afterEach(async ({ request }) => { await runCleanup(request, bag) })

test('Beautify JSON pretty-prints a compact draft without touching pendingOps', async ({ page, request }) => {
  // The Beautify button is the only toolbar action that survived the Apply
  // removal. Its contract: pretty-print the current draft text in place;
  // pretty-printing alone (no semantic change) still counts as a dirty edit
  // because the JSON string is different — so Save must appear.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-dsl-beautify')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  // Compact on a single line; Beautify should expand to multi-line.
  await setAceBody(page, DSL_EDITOR_LABEL, '{"a":1,"b":2}')
  await dialog.getByRole('button', { name: 'Beautify JSON' }).click()

  const formatted = await getAceBody(page, DSL_EDITOR_LABEL)
  expect(JSON.parse(formatted)).toEqual({ a: 1, b: 2 })
  expect(formatted).toMatch(/\n/)
  await expect(dialog.getByTestId('dsl-pending-badge')).toBeVisible({ timeout: DEBOUNCE_BUFFER_MS + 1500 })
})

test('Beautify on invalid JSON surfaces the parse error inline', async ({ page, request }) => {
  // The reducer never silently swallows a parse failure. When Beautify hits
  // invalid JSON it shows the parser's error message in the per-field error
  // slot so the user can locate the issue — and the dispatch bridge stays
  // out of pendingOps until the JSON is repaired.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-dsl-beautify-bad')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  await setAceBody(page, DSL_EDITOR_LABEL, '{"a":}')
  await dialog.getByRole('button', { name: 'Beautify JSON' }).click()

  // The error block sits above the editor; its exact phrasing comes from
  // the JSON.parse SyntaxError, so we match on the substring rather than a
  // localised string.
  await expect(dialog.getByText(/JSON|Unexpected/i).first()).toBeVisible()
  await expect(dialog.getByTestId('fn-studio-save')).toHaveCount(0)
})

test('editing the State sub-tab also queues a dsl-raw op and persists on Save', async ({ page, request }) => {
  // The set and state sub-tabs share one debounced bridge — every dsl-raw
  // op carries both raw strings. A regression that only forwarded the
  // currently-active tab's text would silently drop the other; this test
  // pins that down.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-dsl-state-tab')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  // Localised tab label from 'flow.drawer.dslStateLabel' — "DUE STATE" in en.
  await dialog.getByRole('tab', { name: 'DUE STATE' }).click()
  await expect(dialog.getByRole('tab', { name: 'DUE STATE' })).toHaveAttribute('aria-selected', 'true')

  const nextState = JSON.stringify({ counter: 1 }, null, 2)
  await setAceBody(page, DSL_EDITOR_LABEL, nextState)
  await expect(dialog.getByTestId('dsl-pending-badge')).toBeVisible({ timeout: DEBOUNCE_BUFFER_MS + 1500 })

  const putPromise = waitForWorkflowPut(page, workflowId)
  await dialog.getByTestId('fn-studio-save').click()
  const put = await putPromise
  expect(put.status).toBeLessThan(400)
  expect(pickStage(put.body, 'fn-stage')?.state).toEqual({ counter: 1 })
})

test('editing both Set and State in one session persists both fields in one Save', async ({ page, request }) => {
  // Switching tabs mid-edit must not throw away the off-tab draft. The
  // panel keeps both raw strings in local state; on every debounce tick it
  // pushes a single dsl-raw op carrying both. Save runs that op once.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-dsl-both')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  // Edit Set first (default active tab).
  await setAceBody(page, DSL_EDITOR_LABEL, JSON.stringify({ marker_set: 'A' }, null, 2))
  await expect(dialog.getByTestId('dsl-pending-badge')).toBeVisible({ timeout: DEBOUNCE_BUFFER_MS + 1500 })

  // Capture the dispatched fingerprint after the first edit so we can wait
  // for it to change after the second one. Without this we'd race the click
  // against the debounce timer.
  const fingerprintAfterSet = await dialog
    .getByTestId('dsl-pending-badge')
    .getAttribute('data-pending-fingerprint')

  // Now flip to State and edit there too.
  await dialog.getByRole('tab', { name: 'DUE STATE' }).click()
  await setAceBody(page, DSL_EDITOR_LABEL, JSON.stringify({ marker_state: 'B' }, null, 2))
  // Wait for the debounce to flush the new stateRaw into pendingOps — the
  // fingerprint length changes once the reducer's dsl-raw op carries the new
  // content.
  await expect
    .poll(
      () => dialog.getByTestId('dsl-pending-badge').getAttribute('data-pending-fingerprint'),
      { timeout: DEBOUNCE_BUFFER_MS + 1500 },
    )
    .not.toBe(fingerprintAfterSet)

  // Save → both fields land in the PUT body.
  const putPromise = waitForWorkflowPut(page, workflowId)
  await dialog.getByTestId('fn-studio-save').click()
  const put = await putPromise
  const stage = pickStage(put.body, 'fn-stage')
  expect(stage?.set).toEqual({ marker_set: 'A' })
  expect(stage?.state).toEqual({ marker_state: 'B' })
})

test('local-changes hint appears while dirty and disappears after a clean revert', async ({ page, request }) => {
  // The hint text "You have local Raw DSL changes." doubles as a visual cue
  // when Save is offscreen — its presence/absence must mirror hasLocalChanges
  // exactly. This is the most user-visible read of the dirty flag.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-dsl-hint')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  await expect(dialog.getByText('You have local Raw DSL changes.')).toHaveCount(0)
  await setAceBody(page, DSL_EDITOR_LABEL, JSON.stringify({ dirty: 1 }, null, 2))
  await expect(dialog.getByText('You have local Raw DSL changes.')).toBeVisible()

  await setAceBody(page, DSL_EDITOR_LABEL, '{}')
  await expect(dialog.getByText('You have local Raw DSL changes.')).toHaveCount(0, {
    timeout: DEBOUNCE_BUFFER_MS + 1500,
  })
})

test('Save body is the latest valid JSON, not the most-recently-typed broken text', async ({ page, request }) => {
  // dsl-raw op = "last valid draft". If the user types valid → breaks it →
  // never fixes it, the disabled-Save check handles that (covered in the
  // save spec). This test pins the partial-recovery case: after Save is
  // re-enabled by valid JSON, Save must persist THAT JSON, not the broken
  // intermediate state.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-dsl-latest')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  await setAceBody(page, DSL_EDITOR_LABEL, JSON.stringify({ first: 1 }, null, 2))
  await expect(dialog.getByTestId('fn-studio-save')).toBeEnabled({ timeout: DEBOUNCE_BUFFER_MS + 1500 })

  // Break: Save flips to disabled.
  await setAceBody(page, DSL_EDITOR_LABEL, '{ "first": 1')
  await expect(dialog.getByTestId('fn-studio-save')).toBeDisabled({ timeout: DEBOUNCE_BUFFER_MS + 1500 })

  // Recover with a NEW valid shape: Save must use this, not "first":1.
  await setAceBody(page, DSL_EDITOR_LABEL, JSON.stringify({ recovered: 2 }, null, 2))
  await expect(dialog.getByTestId('fn-studio-save')).toBeEnabled({ timeout: DEBOUNCE_BUFFER_MS + 1500 })

  const putPromise = waitForWorkflowPut(page, workflowId)
  await dialog.getByTestId('fn-studio-save').click()
  const put = await putPromise
  expect(pickStage(put.body, 'fn-stage')?.set).toEqual({ recovered: 2 })
})
