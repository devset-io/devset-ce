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
  makeCleanupBag,
  openFunctionStudio,
  pickStage,
  runCleanup,
  seedSchema,
  seedWorkflow,
  waitForWorkflowPut,
} from './helpers/function-studio'

// Wire format coverage. The whole panel is conditional on the stage's
// schema being type `protobuf`, so every test here seeds a protobuf schema
// first and then a workflow stage that references it via `event`.
test.describe.configure({ mode: 'serial' })

const bag = makeCleanupBag()
test.afterEach(async ({ request }) => { await runCleanup(request, bag) })

const PROTO_BODY = `syntax = "proto2";

package example.dispatch;

message ExampleMessage {
  required string userId = 1;
}
`

async function seedProtoSchema(request: Parameters<typeof seedSchema>[0]): Promise<string> {
  return seedSchema(request, bag, { id: 'wireformat-proto-event', type: 'protobuf', schema: PROTO_BODY })
}

async function seedJsonSchema(request: Parameters<typeof seedSchema>[0]): Promise<string> {
  return seedSchema(request, bag, {
    id: 'wireformat-json-event',
    type: 'json',
    schema: { type: 'object', properties: { value: { type: 'string' } } },
  })
}

test('Wire format panel is absent when the stage schema is JSON', async ({ page, request }) => {
  // The FunctionStudioTasksPanel renders the Wire Format section only when
  // the resolved schema is protobuf — this test pins the negative gate so a
  // future "show by default" regression fails loudly here instead of
  // silently breaking protobuf-only behaviour.
  const eventId = await seedJsonSchema(request)
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-wf-absent', {
    event: eventId,
    schemaId: eventId,
  })
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  await expect(dialog.getByRole('heading', { name: 'Wire Format' })).toHaveCount(0)
  await expect(dialog.getByRole('checkbox', { name: 'Add binary prefix' })).toHaveCount(0)
})

test('Wire format panel appears for protobuf and enabling reveals source + prefix value', async ({ page, request }) => {
  // Symmetric positive gate. The two conditional inputs (source select +
  // prefix-value number input) only mount once the checkbox is on. This
  // catches a regression where they render unconditionally — which would
  // be confusing on a "wire format disabled" stage.
  const eventId = await seedProtoSchema(request)
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-wf-reveal', {
    event: eventId,
    schemaId: eventId,
  })
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  await expect(dialog.getByRole('heading', { name: 'Wire Format' })).toBeVisible()
  const enable = dialog.getByRole('checkbox', { name: 'Add binary prefix' })
  await expect(enable).not.toBeChecked()
  await expect(dialog.getByLabel('Prefix value (0..65535)')).toHaveCount(0)

  await enable.check()
  await expect(dialog.getByLabel('Prefix value (0..65535)')).toBeVisible()
})

test('Prefix value above 65535 surfaces the invalid-range error', async ({ page, request }) => {
  // The reducer's parseWireFormatPrefixValue enforces [0, 65535]. A value
  // outside that range sets `wireFormatPrefixValueError = 'invalid-range'`
  // and the panel renders the localised error string.
  const eventId = await seedProtoSchema(request)
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-wf-error', {
    event: eventId,
    schemaId: eventId,
  })
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  await dialog.getByRole('checkbox', { name: 'Add binary prefix' }).check()
  await dialog.getByLabel('Prefix value (0..65535)').fill('99999')

  await expect(
    dialog.getByText('Prefix value must be an integer in range 0..65535.'),
  ).toBeVisible()
})

test('Enabling wire format + Save persists the wireFormat block on the stage', async ({ page, request }) => {
  // The end-to-end commit path: toggle on → pick a valid prefix value →
  // top-level Save → PUT carries a `wireFormat` object on the stage. The
  // BE then has everything it needs to re-serialise message envelopes.
  const eventId = await seedProtoSchema(request)
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-wf-persist', {
    event: eventId,
    schemaId: eventId,
  })
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  await dialog.getByRole('checkbox', { name: 'Add binary prefix' }).check()
  await dialog.getByLabel('Prefix value (0..65535)').fill('7')

  const putPromise = waitForWorkflowPut(page, workflowId)
  await dialog.getByTestId('fn-studio-save').click()
  const put = await putPromise
  const stage = pickStage(put.body, 'fn-stage') as
    | { wireFormat?: { type: string; prefix?: { source: string; value: number; size: number } } }
    | undefined
  expect(stage?.wireFormat?.type).toBe('binary-prefix')
  expect(stage?.wireFormat?.prefix?.source).toBe('messagePrefix')
  expect(stage?.wireFormat?.prefix?.value).toBe(7)
  expect(stage?.wireFormat?.prefix?.size).toBe(2)
})

test('Disabling wire format on a previously-protobuf stage drops the block on Save', async ({ page, request }) => {
  // Opposite direction of the persist test: the stage starts WITH a
  // wireFormat baked in, the user unchecks the box, and Save must produce
  // a PUT body without the wireFormat key (not "wireFormat: null", just
  // absent). The reducer translates that to a wire-format-clear op which
  // applyPendingOperations forwards as onClearStageWireFormat().
  const eventId = await seedProtoSchema(request)
  const workflowId = await seedWorkflow(request, bag, 'fnstudio-wf-disable', {
    event: eventId,
    schemaId: eventId,
    wireFormat: { type: 'binary-prefix', prefix: { size: 2, source: 'messagePrefix', value: 9 } },
  })
  const dialog = await openFunctionStudio(page, workflowId, 'fn-stage')

  const enable = dialog.getByRole('checkbox', { name: 'Add binary prefix' })
  await expect(enable).toBeChecked()
  await enable.uncheck()

  const putPromise = waitForWorkflowPut(page, workflowId)
  await dialog.getByTestId('fn-studio-save').click()
  const put = await putPromise
  const stage = pickStage(put.body, 'fn-stage')
  expect(stage?.wireFormat).toBeUndefined()
})
