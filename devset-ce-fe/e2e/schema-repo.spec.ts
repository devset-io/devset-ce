/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { expect, test, type Locator, type Page } from '@playwright/test'

// SQLite serializes writes file-wide; multiple workers writing in parallel
// trip [SQLITE_BUSY]. Force serial execution of this spec.
test.describe.configure({ mode: 'serial' })

const SCHEMA_ID_PREFIX = 'e2e'

// Tracked per worker. Any id pushed here gets a best-effort DELETE in afterEach
// so that a failed test does not leave dangling schemas on the shared backend.
const createdSchemaIds: string[] = []

test.afterEach(async ({ request }) => {
  const ids = createdSchemaIds.splice(0)
  await Promise.all(
    ids.map((id) => request.delete(`/api/schemas/${encodeURIComponent(id)}`).catch(() => undefined)),
  )
})

test('schema repo: create JSON and Protobuf schemas, list them, then delete', async ({ page }) => {
  const jsonId = trackUniqueId('json')
  const protoId = trackUniqueId('proto')

  await page.goto('/schema-repo')
  await expect(page.getByRole('heading', { name: 'Schemas' })).toBeVisible()

  const jsonGroup = groupLocator(page, 'JSON')
  const protoGroup = groupLocator(page, 'PROTOBUF')

  await createSchema(page, { id: jsonId, surface: 'json' })
  await expect(jsonGroup.getByText(jsonId)).toBeVisible()

  await createSchema(page, { id: protoId, surface: 'protobuf' })
  await expect(protoGroup.getByText(protoId)).toBeVisible()

  await deleteSchema(page, jsonId)
  await expect(jsonGroup.getByText(jsonId)).toHaveCount(0)

  await deleteSchema(page, protoId)
  await expect(protoGroup.getByText(protoId)).toHaveCount(0)
})

test('schema repo: editing JSON body persists after reload', async ({ page }) => {
  const id = trackUniqueId('json_edit')

  await page.goto('/schema-repo')
  await createSchema(page, { id, surface: 'json' })
  await expect(groupLocator(page, 'JSON').getByText(id)).toBeVisible()

  // exact:true — accessible name matching is a substring search, and any
  // schema id containing the word "edit" would otherwise pull in sidebar nodes.
  const editButton = page.getByRole('button', { name: 'Edit', exact: true })
  await expect(editButton).toBeVisible()
  await editButton.click()
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()

  const newBody = { type: 'object', title: `e2e-edit-${id}` }
  await setAceJsonBody(page, JSON.stringify(newBody, null, 2))

  const putResponse = page.waitForResponse(
    (res) => res.url().includes(`/api/schemas/${id}`) && res.request().method() === 'PUT' && res.ok(),
  )
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await putResponse

  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()

  // Hard reload to prove the body was actually persisted, not just held in memory.
  await page.reload()
  await groupLocator(page, 'JSON').getByText(id).click()
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()

  // Parse before compare — backend may reformat (indentation, key order).
  await expect.poll(async () => JSON.parse(await getAceJsonBody(page))).toEqual(newBody)
})

test('schema repo: saving with empty schema ID surfaces validation and stays in create mode', async ({ page }) => {
  await page.goto('/schema-repo')

  await page.getByRole('button', { name: 'New schema', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Create schema' })).toBeVisible()

  // Leave Schema ID empty.
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  // Client-side guard fires a toast and keeps the editor in create mode —
  // no network call, no phantom schema in either group.
  await expect(page.getByText('Schema ID is required')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Create schema' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
})

function trackUniqueId(kind: string): string {
  const id = `${SCHEMA_ID_PREFIX}_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  createdSchemaIds.push(id)
  return id
}

function groupLocator(page: Page, title: 'JSON' | 'PROTOBUF'): Locator {
  return page
    .locator('.schema-tree-group')
    .filter({ has: page.locator('.schema-tree-group-name', { hasText: title }) })
}

async function createSchema(
  page: Page,
  options: { id: string; surface: 'json' | 'protobuf' },
): Promise<void> {
  await page.getByRole('button', { name: 'New schema', exact: true }).click()
  await page.getByLabel('Schema ID').fill(options.id)
  if (options.surface === 'protobuf') {
    await page.getByRole('tab', { name: 'Protobuf builder' }).click()
  }
  await page.getByRole('button', { name: 'Save', exact: true }).click()
}

async function deleteSchema(page: Page, schemaId: string): Promise<void> {
  page.once('dialog', (dialog) => {
    void dialog.accept()
  })
  await page.getByRole('button', { name: `Actions for ${schemaId}` }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
}

// Ace renders its own DOM with a hidden textarea — page.fill / keyboard tricks
// are flaky and OS-dependent. Ace stores its Editor on the container as
// `.env.editor` (its own re-entry guard, used by ace.edit when called twice
// on the same node). Not exposed in @types/ace-builds.
async function setAceJsonBody(page: Page, value: string): Promise<void> {
  await page.evaluate((next) => {
    const node = document.querySelector('[aria-label="JSON schema editor"]')
    // SAFETY: see comment above.
    const editor = (node as unknown as { env?: { editor: { setValue: (v: string, cursorPos?: number) => void } } } | null)?.env?.editor
    if (!editor) throw new Error('Ace editor not found')
    editor.setValue(next, -1)
  }, value)
}

async function getAceJsonBody(page: Page): Promise<string> {
  return page.evaluate(() => {
    const node = document.querySelector('[aria-label="JSON schema editor"]')
    // SAFETY: see setAceJsonBody.
    const editor = (node as unknown as { env?: { editor: { getValue: () => string } } } | null)?.env?.editor
    if (!editor) throw new Error('Ace editor not found')
    return editor.getValue()
  })
}
