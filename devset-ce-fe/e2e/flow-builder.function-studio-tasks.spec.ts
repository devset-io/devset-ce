/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { expect, test, type Locator } from '@playwright/test'
import {
  makeCleanupBag,
  openFunctionStudio,
  pickStage,
  runCleanup,
  seedWorkflow,
  setAceBody,
  waitForWorkflowPut,
} from './helpers/function-studio'

// Function Task (FunctionBuilder) + State Task panel coverage. With no
// schema seeded the FunctionBuilder falls back to a single target field
// "value" (DEFAULT_FUNCTION_BUILDER_FIELDS), which is enough to drive every
// value mode. State Task fn/when modes likewise don't need a sourceField.
test.describe.configure({ mode: 'serial' })

const bag = makeCleanupBag()
test.afterEach(async ({ request }) => { await runCleanup(request, bag) })

// Returns the Function Task tabpanel locator scoped to the open dialog.
function functionTaskPanel(dialog: Locator): Locator {
  return dialog.locator('#task-panel-function')
}

function stateTaskPanel(dialog: Locator): Locator {
  return dialog.locator('#task-panel-state')
}

test('Function Task: literal string Apply → top Save → PUT writes set.value as the literal', async ({ page, request }) => {
  // The simplest end-to-end of the function-task tab: pick a literal value,
  // click the panel's Apply (which queues a function op), then the top Save
  // commits — same unified Save the user demanded for raw DSL.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-task-literal')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  // Default tab is Function Task; mode select defaults to literal/string.
  const panel = functionTaskPanel(dialog)
  await panel.getByLabel('Literal value').fill('hello-world')
  await panel.getByRole('button', { name: 'Apply' }).click()

  const save = dialog.getByTestId('fn-studio-save')
  await expect(save).toBeVisible()
  const putPromise = waitForWorkflowPut(page, workflowId)
  await save.click()
  const put = await putPromise
  // String literals land in set.{target} verbatim — no $fn/$ref wrapper.
  expect(pickStage(put.body, 'fn-stage')?.set).toEqual({ value: 'hello-world' })
})

test('Function Task: reference mode emits a $ref override', async ({ page, request }) => {
  // ref mode wraps the user-typed path as { "$ref": "<path>" } in the DSL.
  // Validates that the panel's mode→payload mapping survives the round-trip
  // through applyFunctionOverride into the wire format.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-task-ref')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  const panel = functionTaskPanel(dialog)
  await panel.getByLabel('Value type').selectOption('ref')
  await panel.getByLabel('Reference path').fill('source.user_id')
  await panel.getByRole('button', { name: 'Apply' }).click()

  const putPromise = waitForWorkflowPut(page, workflowId)
  await dialog.getByTestId('fn-studio-save').click()
  const put = await putPromise
  expect(pickStage(put.body, 'fn-stage')?.set).toEqual({ value: { $ref: 'source.user_id' } })
})

test('Function Task: fn mode emits a $fn override', async ({ page, request }) => {
  // $fn is the workhorse of the DSL — anything beyond a literal/ref tends
  // to flow through it. The FunctionExpressionBuilder is its own subwidget,
  // but for the purposes of this test we just need the text it produces to
  // make it into set.value.$fn.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-task-fn')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  const panel = functionTaskPanel(dialog)
  await panel.getByLabel('Value type').selectOption('fn')
  // FunctionExpressionBuilder defaults to "Builder" mode where the value is
  // assembled from a function select + args. Flipping the "Function input"
  // toggle to "Expression" mounts a freeform Ace editor we can drive
  // directly with setAceBody — far less brittle than poking at every arg.
  await panel.getByLabel('Function input').selectOption('expression')
  await setAceBody(page, 'Function expression', 'now()')
  await panel.getByRole('button', { name: 'Apply' }).click()

  const putPromise = waitForWorkflowPut(page, workflowId)
  await dialog.getByTestId('fn-studio-save').click()
  const put = await putPromise
  const set = pickStage(put.body, 'fn-stage')?.set as { value?: { $fn?: string } } | undefined
  expect(set?.value?.$fn).toBe('now()')
})

test('Function Task: path mode emits a $path override', async ({ page, request }) => {
  // $path covers runtime traversal — same shape as $ref but with a
  // different key. A typo where the panel emits $ref instead of $path would
  // silently break runtime resolution; this test guards that boundary.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-task-path')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  const panel = functionTaskPanel(dialog)
  await panel.getByLabel('Value type').selectOption('path')
  await panel.getByLabel('Runtime path').fill('state.entity.userId')
  await panel.getByRole('button', { name: 'Apply' }).click()

  const putPromise = waitForWorkflowPut(page, workflowId)
  await dialog.getByTestId('fn-studio-save').click()
  const put = await putPromise
  expect(pickStage(put.body, 'fn-stage')?.set).toEqual({ value: { $path: 'state.entity.userId' } })
})

test('Function Task: when mode emits the when/value block', async ({ page, request }) => {
  // when is the only mode that carries multiple fields into the payload —
  // condition expression + value + (optional) default. The reducer
  // serialises the conditionKind/args into a single $fn-call string, then
  // wraps the value as a parsed JSON fragment. This test pins the full
  // round-trip down to that final shape.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-task-when')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  const panel = functionTaskPanel(dialog)
  await panel.getByLabel('Value type').selectOption('when')
  await panel.getByLabel('Condition arg A').fill('1')
  await panel.getByLabel('Condition arg B').fill('1')
  // The "Default value (JSON fragment)" textarea also matches a substring
  // lookup, so we use the accessible-name role match with exact: true.
  await panel.getByRole('textbox', { name: 'Value (JSON fragment)', exact: true }).fill('"YES"')
  await panel.getByRole('button', { name: 'Apply' }).click()

  const putPromise = waitForWorkflowPut(page, workflowId)
  await dialog.getByTestId('fn-studio-save').click()
  const put = await putPromise
  const value = pickStage(put.body, 'fn-stage')?.set as
    | { value?: { when?: { $fn?: string }; value?: unknown } }
    | undefined
  expect(value?.value?.when?.$fn).toMatch(/^[a-z]+\(1,1\)$/i)
  expect(value?.value?.value).toBe('YES')
})

test('Function Task: Apply stays disabled until a ref path is non-empty', async ({ page, request }) => {
  // Validation belongs to the panel, not the reducer. If Apply fires on an
  // empty refValue we'd queue an op with a meaningless empty $ref — better
  // to keep the button inert until there's actually something to commit.
  // The panel seeds Reference path with a default 'value' (see
  // function-builder.utils.ts), so we clear it before asserting disabled.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-task-disabled')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  const panel = functionTaskPanel(dialog)
  await panel.getByLabel('Value type').selectOption('ref')
  await panel.getByLabel('Reference path').fill('')
  const apply = panel.getByRole('button', { name: 'Apply' })
  await expect(apply).toBeDisabled()

  await panel.getByLabel('Reference path').fill('user.id')
  await expect(apply).toBeEnabled()
})

test('State Task (fn mode) → Apply → top Save persists the state mapping', async ({ page, request }) => {
  // State Task is the parallel of Function Task for the state block. The
  // fn-mode path doesn't need a sourceField, so we don't have to bring a
  // schema in just to assert the shape ends up under stage.state.{path}.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-statetask-fn')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  await dialog.getByRole('tab', { name: 'State task' }).click()
  const panel = stateTaskPanel(dialog)
  await panel.getByLabel('Mapping mode').selectOption('fn')
  await panel.getByLabel(/^Target state path/).fill('entity.counter')
  // Same Builder→Expression switch as the function task fn test — gives us
  // a clean setAceBody target instead of the multi-arg builder UI.
  await panel.getByLabel('Function input').selectOption('expression')
  await setAceBody(page, 'Function expression', 'now()')
  await panel.getByRole('button', { name: 'Apply state task' }).click()

  const putPromise = waitForWorkflowPut(page, workflowId)
  await dialog.getByTestId('fn-studio-save').click()
  const put = await putPromise
  const stateBlock = pickStage(put.body, 'fn-stage')?.state as
    | Record<string, { $fn?: string }>
    | undefined
  expect(stateBlock?.['entity.counter']?.$fn).toBe('now()')
})

test('State Task (when mode) → Apply → top Save persists the when block', async ({ page, request }) => {
  // when on the state side has the same condition / value / default shape
  // as on the set side. The payload key is the same ("when" + "value" +
  // optionally "default"), so this is the strongest single test of the
  // state-task encoding path.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-statetask-when')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  await dialog.getByRole('tab', { name: 'State task' }).click()
  const panel = stateTaskPanel(dialog)
  await panel.getByLabel('Mapping mode').selectOption('when')
  await panel.getByLabel(/^Target state path/).fill('entity.flag')
  await panel.getByLabel(/^Condition \(when/).fill('eq(1,1)')
  await panel.getByLabel(/^Value \(JSON fragment\)/).fill('"YES"')
  await panel.getByRole('button', { name: 'Apply state task' }).click()

  const putPromise = waitForWorkflowPut(page, workflowId)
  await dialog.getByTestId('fn-studio-save').click()
  const put = await putPromise
  const block = (pickStage(put.body, 'fn-stage')?.state as
    | Record<string, { when?: { $fn?: string }; value?: unknown }>
    | undefined)?.['entity.flag']
  expect(block?.when?.$fn).toBe('eq(1,1)')
  expect(block?.value).toBe('YES')
})

test('State Task: Apply stays disabled until targetStatePath and fnExpression are non-empty', async ({ page, request }) => {
  // Mirror of the Function Task validation test on the State side.
  // Different gating expression in StateTaskPanel.tsx but same UX
  // contract.
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-statetask-disabled')
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  await dialog.getByRole('tab', { name: 'State task' }).click()
  const panel = stateTaskPanel(dialog)
  await panel.getByLabel('Mapping mode').selectOption('fn')
  await panel.getByLabel(/^Target state path/).fill('')
  const apply = panel.getByRole('button', { name: 'Apply state task' })
  await expect(apply).toBeDisabled()

  await panel.getByLabel(/^Target state path/).fill('entity.x')
  // fnExpression auto-populates a default skeleton when switching to fn
  // mode (see syncStateTaskField in useFunctionStudioDrawerState), so the
  // button should enable once the target is set.
  await expect(apply).toBeEnabled()
})
