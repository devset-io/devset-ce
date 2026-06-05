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
  pickStage,
  runCleanup,
  seedWorkflow,
  setAceBody,
  waitForWorkflowPut,
} from './helpers/function-studio'

// These tests cover the unified-save flow in Function Studio's Raw DSL tab.
// The earlier UX had a per-panel "Apply" button that wrote directly to
// builderState without entering pendingOps, so the top-level Save could not
// detect a DSL-only edit and quietly skipped the backend PUT. The fix queues
// raw-DSL edits as a `dsl-raw` pending op via a debounced bridge, so the same
// top-level Save commits everything and the PUT body contains the new DSL.
test.describe.configure({ mode: 'serial' })

const bag = makeCleanupBag()
test.afterEach(async ({ request }) => { await runCleanup(request, bag) })

test('raw DSL edit surfaces the top Save and persists to /api/workflows on click', async ({ page, request }) => {
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-save-happy')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  // The DSL panel debounces drafts (400ms) into pendingOps. Until then the
  // top Save is hidden (no pendingOps). After typing + debounce it must
  // appear with no other action required by the user.
  await expect(dialog.getByTestId('fn-studio-save')).toHaveCount(0)

  const nextSet = JSON.stringify({ user_id: { $fn: 'now()' } }, null, 2)
  await setAceBody(page, DSL_EDITOR_LABEL, nextSet)

  // The pending badge proves the reducer accepted the dsl-raw op — i.e. the
  // panel→reducer bridge fired correctly. Without it, Save would stay hidden.
  await expect(dialog.getByTestId('dsl-pending-badge')).toBeVisible({ timeout: DEBOUNCE_BUFFER_MS + 1500 })
  const save = dialog.getByTestId('fn-studio-save')
  await expect(save).toBeVisible()
  await expect(save).toBeEnabled()

  // The real proof that Save actually persists: capture the PUT and verify
  // the body carries the edited DSL. The previous bug made Save return early
  // (pendingOps.length === 0) so the request never fired at all.
  const putPromise = waitForWorkflowPut(page, workflowId)
  await save.click()
  const put = await putPromise
  expect(put.status).toBeLessThan(400)
  expect(pickStage(put.body, 'fn-stage')?.set).toEqual({ user_id: { $fn: 'now()' } })

  // After Save the dialog returns to a clean state — pendingOps cleared, no
  // Save button rendered (it's gated on hasPendingChanges).
  await expect(dialog.getByTestId('fn-studio-save')).toHaveCount(0)
})

test('invalid JSON in raw DSL disables top Save until JSON parses again', async ({ page, request }) => {
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-save-invalid')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  // Establish a valid pending op first so Save is rendered — otherwise the
  // header simply hides it (hasPendingChanges === false) and "disabled" is
  // indistinguishable from "absent". With the op queued, we get to observe
  // the disabled-while-error state explicitly.
  await setAceBody(page, DSL_EDITOR_LABEL, JSON.stringify({ ok: 1 }, null, 2))
  const save = dialog.getByTestId('fn-studio-save')
  await expect(save).toBeVisible({ timeout: DEBOUNCE_BUFFER_MS + 1500 })
  await expect(save).toBeEnabled()

  // Now break the JSON. The dslRawErrorChanged signal must flip the flag
  // even though the dsl-raw op (from the previous valid draft) is still
  // queued — the reducer's save guard must refuse to fire.
  await setAceBody(page, DSL_EDITOR_LABEL, '{ "ok": 1')
  await expect(save).toBeDisabled({ timeout: DEBOUNCE_BUFFER_MS + 1500 })

  // Verify no PUT leaks while disabled. Don't click — a disabled button
  // cannot fire onClick under normal interaction; force-clicking would just
  // mask any regression that allowed it through.
  const network = page.waitForRequest(
    (req) => req.method() === 'PUT' && req.url().includes(`/api/workflows/${workflowId}`),
    { timeout: 1000 },
  )
  await expect(network).rejects.toThrow()

  // Fix the JSON — Save must re-enable without any extra user action.
  await setAceBody(page, DSL_EDITOR_LABEL, JSON.stringify({ ok: 2 }, null, 2))
  await expect(save).toBeEnabled({ timeout: DEBOUNCE_BUFFER_MS + 1500 })
})

test('raw DSL panel no longer renders an Apply button', async ({ page, request }) => {
  // Regression check on the UX change itself: the Apply button is the
  // signature of the old two-step flow, and its removal is what the user
  // explicitly asked for. If a future refactor brings it back we want this
  // test to fail loudly.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-no-apply')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  await expect(dialog.getByRole('button', { name: /^Apply$/i })).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: /^Zastosuj$/i })).toHaveCount(0)
  // The Beautify button is the only formatting-side button that survives.
  await expect(dialog.getByRole('button', { name: 'Beautify JSON' })).toBeVisible()
})

test('Reset in the header reverts pending raw DSL edits without hitting backend', async ({ page, request }) => {
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-reset')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  const draft = JSON.stringify({ never_saved: true }, null, 2)
  await setAceBody(page, DSL_EDITOR_LABEL, draft)
  await expect(dialog.getByTestId('fn-studio-save')).toBeVisible({ timeout: DEBOUNCE_BUFFER_MS + 1500 })

  // Reset uses the same selector pattern (button with the localized label)
  // because the Header doesn't hand out a testid for it. The reducer's
  // resetDraft action also snaps editorMode back to 'function-studio', so
  // the Raw DSL editor unmounts — that's why we don't assert editor contents
  // here; reopening the tab to verify `{}` would be circular (it re-derives
  // from the persisted source we're already trusting via the PUT-not-fired
  // check below).
  await dialog.getByRole('button', { name: 'Reset' }).click()
  await expect(dialog.getByTestId('fn-studio-save')).toHaveCount(0)

  // Sanity: a Reset must not hit the backend — that would be data loss
  // disguised as a discard. Catch a stray PUT inside a short window.
  const stray = page.waitForRequest(
    (req) => req.method() === 'PUT' && req.url().includes(`/api/workflows/${workflowId}`),
    { timeout: 800 },
  )
  await expect(stray).rejects.toThrow()
})

test('source-mode toggle queues a pending op and persists the new source on Save', async ({ page, request }) => {
  // The snapshot panel's source-mode toggle dispatches sourceChangeDraft,
  // which the reducer translates to a `source` pending op. The user's
  // complaint about "Save not updating state" applied equally here — any
  // path through pendingOps that the top Save doesn't pick up is a bug.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-source')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  // Click "previous-stage" inside the dialog's "Source mode" radio-like group.
  // aria-label="Source mode" disambiguates from any unrelated buttons on the
  // canvas behind the dialog.
  await dialog.getByRole('group', { name: 'Source mode' }).getByRole('button', { name: 'previous-stage' }).click()

  const save = dialog.getByTestId('fn-studio-save')
  await expect(save).toBeVisible()

  const putPromise = waitForWorkflowPut(page, workflowId)
  await save.click()
  const put = await putPromise
  expect(put.status).toBeLessThan(400)
  expect(pickStage(put.body, 'fn-stage')?.source).toBe('previous-stage')

  // Single Save run — pending list goes back to empty afterward.
  await expect(dialog.getByTestId('fn-studio-save')).toHaveCount(0)
})

test('raw DSL edit + source-mode change persist together in a single Save', async ({ page, request }) => {
  // Multi-op batching is the core promise of pendingOps — if the unified
  // Save misses one when several are queued, the user is back to the same
  // "did it really save?" confusion that motivated this rework.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-multi')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  const nextSet = JSON.stringify({ multi_test: true }, null, 2)
  await setAceBody(page, DSL_EDITOR_LABEL, nextSet)
  await expect(dialog.getByTestId('dsl-pending-badge')).toBeVisible({ timeout: DEBOUNCE_BUFFER_MS + 1500 })

  // Switch back to function-studio mode so the Source mode toggle is reachable
  // — it lives in the snapshot panel which is rendered in either mode, but
  // only the function-studio mode exposes it in the left column without the
  // Raw DSL editor stealing focus.
  await dialog.getByRole('button', { name: 'Function Task' }).click()
  await dialog.getByRole('group', { name: 'Source mode' }).getByRole('button', { name: 'previous-stage' }).click()

  const save = dialog.getByTestId('fn-studio-save')
  await expect(save).toBeEnabled()

  const putPromise = waitForWorkflowPut(page, workflowId)
  await save.click()
  const put = await putPromise
  expect(put.status).toBeLessThan(400)
  const stage = pickStage(put.body, 'fn-stage')
  expect(stage?.source).toBe('previous-stage')
  expect(stage?.set).toEqual({ multi_test: true })
})

test('closing with pending changes opens the discard modal; Back keeps state', async ({ page, request }) => {
  // The dialog must refuse to silently drop user work. The Close button is
  // a likely escape hatch the user reaches for by accident — the discard
  // modal is the only thing standing between a misclick and lost edits.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-discard-back')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  await setAceBody(page, DSL_EDITOR_LABEL, JSON.stringify({ pending: true }, null, 2))
  await expect(dialog.getByTestId('fn-studio-save')).toBeVisible({ timeout: DEBOUNCE_BUFFER_MS + 1500 })

  await dialog.getByRole('button', { name: 'Close' }).click()
  // The discard modal mounts a new dialog with its own title. Scope assertions
  // to it explicitly — there are two dialogs on the page once it's open.
  const discard = page.getByRole('dialog', { name: 'Unsaved changes' })
  await expect(discard).toBeVisible()

  // "Back" returns to the Function Studio drawer with state intact — the
  // Save button must still be there because pendingOps wasn't cleared.
  await discard.getByRole('button', { name: 'Back' }).click()
  await expect(discard).toHaveCount(0)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByTestId('fn-studio-save')).toBeVisible()
})

test('discard modal confirm closes the drawer without persisting to backend', async ({ page, request }) => {
  // Mirror of the previous test for the other branch: confirming the
  // discard must close everything AND not silently fire a PUT (that would
  // be a "save by accident" worse than the original bug).
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-discard-confirm')
  const dialog = await openFunctionStudioDsl(page, workflowId, 'fn-stage')

  await setAceBody(page, DSL_EDITOR_LABEL, JSON.stringify({ thrown_away: true }, null, 2))
  await expect(dialog.getByTestId('fn-studio-save')).toBeVisible({ timeout: DEBOUNCE_BUFFER_MS + 1500 })

  // Pre-arm the PUT listener BEFORE the discard click so the rejection
  // timer covers the full window in which a buggy implementation could fire.
  const stray = page.waitForRequest(
    (req) => req.method() === 'PUT' && req.url().includes(`/api/workflows/${workflowId}`),
    { timeout: 1000 },
  )

  await dialog.getByRole('button', { name: 'Close' }).click()
  const discard = page.getByRole('dialog', { name: 'Unsaved changes' })
  await discard.getByRole('button', { name: 'Close without saving' }).click()

  await expect(discard).toHaveCount(0)
  await expect(dialog).toHaveCount(0)
  await expect(stray).rejects.toThrow()
})

test('Reset wipes a mix of pending ops in one click', async ({ page, request }) => {
  // The single-op Reset path is covered earlier. This variant pins down the
  // contract that one Reset clears *all* op kinds — a regression here would
  // re-introduce the half-stale state the unified Save was meant to remove.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-multi-reset')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  await dialog.getByRole('group', { name: 'Source mode' }).getByRole('button', { name: 'previous-stage' }).click()
  await dialog.getByRole('button', { name: 'Raw DSL' }).click()
  await setAceBody(page, DSL_EDITOR_LABEL, JSON.stringify({ also_dirty: 1 }, null, 2))
  await expect(dialog.getByTestId('fn-studio-save')).toBeVisible({ timeout: DEBOUNCE_BUFFER_MS + 1500 })

  // Reset snaps back to function-studio mode AND clears pendingOps — assert
  // both indirectly via the Save button vanishing.
  await dialog.getByRole('button', { name: 'Reset' }).click()
  await expect(dialog.getByTestId('fn-studio-save')).toHaveCount(0)

  // Source toggle should be back to the seeded default ('none'). aria-pressed
  // is the canonical bridge to that state without scraping CSS classes.
  await expect(
    dialog.getByRole('group', { name: 'Source mode' }).getByRole('button', { name: 'none' }),
  ).toHaveAttribute('aria-pressed', 'true')
})
