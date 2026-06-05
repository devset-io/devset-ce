/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

// Shared helpers for Function Studio e2e specs. Each spec brings its own
// describe/serial config, but the seed/open/setAceBody primitives are the
// same across all of them — keeping them here avoids n-way duplication and
// keeps the unique-aria-label decisions in one place.

import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'

export const DSL_EDITOR_LABEL = 'JSON editor'
export const DEBOUNCE_BUFFER_MS = 1200

export type CleanupBag = {
  workflowIds: string[]
  schemaIds: string[]
}

export function makeCleanupBag(): CleanupBag {
  return { workflowIds: [], schemaIds: [] }
}

export async function runCleanup(request: APIRequestContext, bag: CleanupBag): Promise<void> {
  for (const id of bag.workflowIds) {
    await request.delete(`/api/workflows/${encodeURIComponent(id)}`).catch(() => {})
  }
  for (const id of bag.schemaIds) {
    await request.delete(`/api/schemas/${encodeURIComponent(id)}`).catch(() => {})
  }
  bag.workflowIds.length = 0
  bag.schemaIds.length = 0
}

export type SeedWorkflowOptions = {
  stageId?: string
  event?: string
  schemaId?: string
  set?: Record<string, unknown>
  state?: Record<string, unknown>
  wireFormat?: unknown
}

export async function seedWorkflow(
  request: APIRequestContext,
  bag: CleanupBag,
  idPrefix: string,
  options: SeedWorkflowOptions = {},
): Promise<string> {
  const workflowId = `${idPrefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
  const stage: Record<string, unknown> = {
    stage: options.stageId ?? 'fn-stage',
    event: options.event ?? 'fn-event',
    source: 'none',
    emit: true,
    set: options.set ?? {},
    state: options.state ?? {},
  }
  if (options.schemaId) stage.schemaId = options.schemaId
  if (options.wireFormat) stage.wireFormat = options.wireFormat
  const payload = {
    id: workflowId,
    producerName: 'e2e-producer',
    topic: 'e2e.topic',
    executions: 1,
    state: {},
    pipeline: [stage],
  }
  const response = await request.post('/api/workflows', {
    data: payload,
    headers: { 'Content-Type': 'application/json' },
  })
  expect(response.status(), `workflow seed must succeed (got ${response.status()})`).toBeLessThan(400)
  bag.workflowIds.push(workflowId)
  return workflowId
}

export type SeedSchemaOptions = {
  id: string
  type: 'json' | 'protobuf'
  schema: Record<string, unknown> | string
}

export async function seedSchema(
  request: APIRequestContext,
  bag: CleanupBag,
  options: SeedSchemaOptions,
): Promise<string> {
  // Delete any leftover from a previous run with the same id; the BE rejects
  // duplicates. Ignored failures are fine — 404 just means there was nothing.
  await request.delete(`/api/schemas/${encodeURIComponent(options.id)}`).catch(() => {})
  const response = await request.post('/api/schemas', {
    data: { id: options.id, type: options.type, schema: options.schema },
    headers: { 'Content-Type': 'application/json' },
  })
  expect(response.status(), `schema seed must succeed (got ${response.status()})`).toBeLessThan(400)
  bag.schemaIds.push(options.id)
  return options.id
}

// Navigate to the workflow's canvas and click the seeded node. Stops once the
// sidebar reveals "Open Function Studio" (proof that node selection took).
export async function openCanvasAndSelectNode(
  page: Page,
  workflowId: string,
  nodeId: string,
): Promise<void> {
  await page.goto('/flow-builder')
  const row = page.getByRole('row').filter({ hasText: workflowId })
  await row.getByRole('button', { name: 'Open' }).click()
  const node = page.locator(`.react-flow__node[data-id="${nodeId}"]`)
  await expect(node).toBeVisible()
  await node.click()
}

export async function openFunctionStudio(
  page: Page,
  workflowId: string,
  nodeId: string,
): Promise<Locator> {
  await openCanvasAndSelectNode(page, workflowId, nodeId)
  await page.getByRole('button', { name: 'Open Function Studio' }).click()
  const dialog = page.getByRole('dialog', { name: 'Function Studio' })
  await expect(dialog).toBeVisible()
  return dialog
}

export async function openFunctionStudioDsl(
  page: Page,
  workflowId: string,
  nodeId: string,
): Promise<Locator> {
  const dialog = await openFunctionStudio(page, workflowId, nodeId)
  await dialog.getByRole('button', { name: 'Raw DSL' }).click()
  await expect(page.locator(`[aria-label="${DSL_EDITOR_LABEL}"]`)).toBeVisible()
  return dialog
}

// Ace bypass for headless write. Mirrors the helper in
// message-dispatch.payload-and-schema.spec.ts so the suite stays consistent.
// The editor stores its Editor instance on `env.editor` (Ace's re-entry
// guard); not exposed in @types/ace-builds.
export async function setAceBody(page: Page, editorAriaLabel: string, value: string): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate((aria) => {
        const node = document.querySelector(`[aria-label="${aria}"]`)
        return Boolean((node as unknown as { env?: { editor?: unknown } } | null)?.env?.editor)
      }, editorAriaLabel),
    )
    .toBe(true)

  await page.evaluate(({ aria, next }) => {
    const node = document.querySelector(`[aria-label="${aria}"]`)
    // SAFETY: see comment above.
    const editor = (node as unknown as { env?: { editor: { setValue: (v: string, cursorPos?: number) => void } } } | null)?.env?.editor
    if (!editor) throw new Error('Ace editor not found')
    editor.setValue(next, -1)
  }, { aria: editorAriaLabel, next: value })
}

export async function getAceBody(page: Page, editorAriaLabel: string): Promise<string> {
  return page.evaluate((aria) => {
    const node = document.querySelector(`[aria-label="${aria}"]`)
    // SAFETY: see setAceBody.
    const editor = (node as unknown as { env?: { editor: { getValue: () => string } } } | null)?.env?.editor
    if (!editor) throw new Error('Ace editor not found')
    return editor.getValue()
  }, editorAriaLabel)
}

// Waits for the next PUT /api/workflows/<id> and returns the parsed body.
// Fails with a clear message if no PUT fires within the timeout.
export async function waitForWorkflowPut(
  page: Page,
  workflowId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await page.waitForResponse(
    (r) => r.request().method() === 'PUT' && r.url().includes(`/api/workflows/${workflowId}`),
  )
  const raw = response.request().postData() ?? '{}'
  return { status: response.status(), body: JSON.parse(raw) as Record<string, unknown> }
}

export type Pipeline = Array<Record<string, unknown>>
export function pickStage(body: Record<string, unknown>, stageId: string): Record<string, unknown> | undefined {
  const pipeline = body.pipeline as Pipeline | undefined
  return pipeline?.find((s) => s.stage === stageId)
}
