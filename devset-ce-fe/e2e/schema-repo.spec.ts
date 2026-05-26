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
  // Sequential, not Promise.all: SQLite serializes writes file-wide and parallel
  // DELETEs trip [SQLITE_BUSY], leaving an orphan schema in the DB (the catch
  // silences the error so the test still passes).
  for (const id of ids) {
    await request.delete(`/api/schemas/${encodeURIComponent(id)}`).catch(() => undefined)
  }
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
  await setAceBody(page, 'JSON schema editor', JSON.stringify(newBody, null, 2))

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
  await expect.poll(async () => JSON.parse(await getAceBody(page, 'JSON schema editor'))).toEqual(newBody)
})

test('schema repo: editing Protobuf body persists after reload', async ({ page }) => {
  const id = trackUniqueId('proto_edit')

  await page.goto('/schema-repo')
  await createSchema(page, { id, surface: 'protobuf' })
  await expect(groupLocator(page, 'PROTOBUF').getByText(id)).toBeVisible()

  const editButton = page.getByRole('button', { name: 'Edit', exact: true })
  await expect(editButton).toBeVisible()
  await editButton.click()
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()

  const newProto = `syntax = "proto3";\n\npackage app.v1;\n\nmessage EditedEvent {\n  string id = 1;\n  int32 count = 2;\n}\n`
  await setAceBody(page, 'Protobuf schema editor', newProto)

  const putResponse = page.waitForResponse(
    (res) => res.url().includes(`/api/schemas/${id}`) && res.request().method() === 'PUT' && res.ok(),
  )
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await putResponse

  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()

  // Hard reload to prove the proto body was persisted, not just held in memory.
  // Protobuf goes through a different reducer branch than JSON in
  // normalizeSchemaPayloadForDraft (string vs object payload), so JSON-only
  // coverage would miss regressions on this path.
  await page.reload()
  await groupLocator(page, 'PROTOBUF').getByText(id).click()
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()

  await expect
    .poll(async () => (await getAceBody(page, 'Protobuf schema editor')).trim())
    .toBe(newProto.trim())
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

test('schema repo: saving non-object JSON body surfaces validation and stays in create mode', async ({ page }) => {
  // ID is tracked so a stray POST cannot leak schemas across runs; in practice
  // validation fires before any network call, so cleanup will 404 (silenced).
  const id = trackUniqueId('json_invalid')

  await page.goto('/schema-repo')
  await page.getByRole('button', { name: 'New schema', exact: true }).click()
  await page.getByLabel('Schema ID').fill(id)

  // Array is valid JSON but not an object — trips the post-parse guard in
  // parseSchemaPayload, a separate path from the "Schema ID required" gate.
  await setAceBody(page, 'JSON schema editor', '[]')
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(page.getByText('JSON schema must be an object')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Create schema' })).toBeVisible()
  await expect(groupLocator(page, 'JSON').getByText(id)).toHaveCount(0)
})

test('schema repo: editor surface cannot be switched in edit mode', async ({ page }) => {
  const id = trackUniqueId('surface_lock')

  await page.goto('/schema-repo')
  await createSchema(page, { id, surface: 'json' })
  await expect(groupLocator(page, 'JSON').getByText(id)).toBeVisible()

  // After save the schema lands in view mode — surface tabs are absent here too,
  // so the edit-mode assertion below has to show that the lock persists *into*
  // edit, not just that it never appeared.
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible()

  // canSwitchSurface === (editorMode === 'create'), so the tablist is replaced
  // by a static pill in edit mode. No tabs ⇒ user cannot retype a JSON schema
  // into a protobuf one mid-edit.
  await expect(page.getByRole('tablist', { name: 'Schema editor mode' })).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Protobuf builder' })).toHaveCount(0)
  await expect(page.locator('.schema-editor-mode-pill', { hasText: 'JSON' })).toBeVisible()
})

test('schema repo: cancelling edit reverts unsaved JSON changes', async ({ page }) => {
  const id = trackUniqueId('json_cancel')

  await page.goto('/schema-repo')
  await createSchema(page, { id, surface: 'json' })
  await expect(groupLocator(page, 'JSON').getByText(id)).toBeVisible()

  // After create the row is selected and the draft is hydrated from the persisted
  // schema — capture that canonical form so we can assert exact revert later
  // (backend may reformat indentation / key order, so we don't compare to a
  // hand-built string).
  const originalBody = await getAceBody(page, 'JSON schema editor')

  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await setAceBody(page, 'JSON schema editor', JSON.stringify({ type: 'object', dirty: true }, null, 2))

  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()

  // cancelEdit re-hydrates the draft from the selected schema — dirty content
  // must be gone, and crucially identical to what we saw before Edit was clicked.
  expect(await getAceBody(page, 'JSON schema editor')).toBe(originalBody)
})

test('schema repo: saving empty Protobuf body surfaces validation and stays in create mode', async ({ page }) => {
  const id = trackUniqueId('proto_invalid')

  await page.goto('/schema-repo')
  await page.getByRole('button', { name: 'New schema', exact: true }).click()
  await page.getByLabel('Schema ID').fill(id)
  await page.getByRole('tab', { name: 'Protobuf builder' }).click()

  // Whitespace-only trips requireTrimmed → labels.protoNonEmpty. Different
  // branch from the JSON-object guard, even though both are surfaced as toasts.
  await setAceBody(page, 'Protobuf schema editor', '   \n  ')
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(page.getByText('Protobuf schema must be a non-empty .proto string')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Create schema' })).toBeVisible()
  await expect(groupLocator(page, 'PROTOBUF').getByText(id)).toHaveCount(0)
})

test('schema repo: search filters schemas by ID', async ({ page }) => {
  // Two schemas share a stable prefix so we can hit one with a query that
  // wouldn't match the other — Date.now() + random suffix in trackUniqueId
  // makes a substring of just "alpha"/"beta" unambiguous across runs.
  const idAlpha = trackUniqueId('search_alpha')
  const idBeta = trackUniqueId('search_beta')

  await page.goto('/schema-repo')
  await createSchema(page, { id: idAlpha, surface: 'json' })
  await createSchema(page, { id: idBeta, surface: 'json' })

  const jsonGroup = groupLocator(page, 'JSON')
  await expect(jsonGroup.getByText(idAlpha)).toBeVisible()
  await expect(jsonGroup.getByText(idBeta)).toBeVisible()

  const search = page.getByLabel('Search schemas')

  // Filter to "alpha" — only the matching row remains. useDeferredValue means
  // the list updates a tick after the input value, so we rely on Playwright's
  // expect-polling rather than a manual wait.
  await search.fill('alpha')
  await expect(jsonGroup.getByText(idAlpha)).toBeVisible()
  await expect(jsonGroup.getByText(idBeta)).toHaveCount(0)

  // Empty query restores the full list.
  await search.fill('')
  await expect(jsonGroup.getByText(idAlpha)).toBeVisible()
  await expect(jsonGroup.getByText(idBeta)).toBeVisible()
})

test('schema repo: creating a schema with an existing ID does not duplicate the row', async ({ page }) => {
  const id = trackUniqueId('dup_id')

  await page.goto('/schema-repo')
  await createSchema(page, { id, surface: 'json' })
  await expect(groupLocator(page, 'JSON').getByText(id)).toHaveCount(1)

  // Second create with the same id — backend rejects, the saveSchema effect
  // catches and toasts, dispatching saveFailed (no editorMode change). We don't
  // assert the toast text because it bubbles up the backend error message and
  // would couple the test to BE wording.
  await page.getByRole('button', { name: 'New schema', exact: true }).click()
  await page.getByLabel('Schema ID').fill(id)
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Create schema' })).toBeVisible()
  // The critical guarantee: still exactly one row with this id — no phantom
  // duplicate from an over-eager optimistic insert in the reducer.
  await expect(groupLocator(page, 'JSON').getByText(id)).toHaveCount(1)
})

test('schema repo: deleting the selected schema selects the next remaining one', async ({ page }) => {
  const idKeep = trackUniqueId('keep')
  const idDrop = trackUniqueId('drop')

  await page.goto('/schema-repo')
  await createSchema(page, { id: idKeep, surface: 'json' })
  await createSchema(page, { id: idDrop, surface: 'json' })

  // The just-created schema wins selection via resolveSelectedSchemaId's
  // `preferred` arg in the saveSchema effect — viewer title doubles as a
  // selection witness (editor.title === selected schema id in view mode).
  await expect(page.getByRole('heading', { name: idDrop })).toBeVisible()

  await deleteSchema(page, idDrop)
  await expect(groupLocator(page, 'JSON').getByText(idDrop)).toHaveCount(0)

  // After the post-delete reload, current=idDrop is no longer in the list, so
  // resolveSelectedSchemaId falls through to schemas[0]. Only idKeep remains,
  // so it MUST be the new selection regardless of backend ordering.
  await expect(page.getByRole('heading', { name: idKeep })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeEnabled()
})

test('schema repo: clicking outside an open row menu closes it', async ({ page }) => {
  const id = trackUniqueId('menu_outside')

  await page.goto('/schema-repo')
  await createSchema(page, { id, surface: 'json' })

  await page.getByRole('button', { name: `Actions for ${id}` }).click()
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible()

  // The document-level mousedown listener (registered while openMenuKey !== null)
  // closes the menu on any pointerdown outside .schema-tree-menu-wrap. The
  // sidebar "Schemas" heading is a safe neutral target — outside the wrap and
  // unambiguous on this page.
  await page.getByRole('heading', { name: 'Schemas' }).click()
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toHaveCount(0)
})

test('schema repo: collapsing a group hides its schemas, expanding restores them', async ({ page }) => {
  const id = trackUniqueId('group_toggle')

  await page.goto('/schema-repo')
  await createSchema(page, { id, surface: 'json' })
  await expect(groupLocator(page, 'JSON').getByText(id)).toBeVisible()

  // aria-expanded is the source of truth for group visibility — assert on that
  // instead of the .is-expanded class, which is presentation-only and could
  // diverge from state under a style refactor.
  const toggle = groupLocator(page, 'JSON').locator('.schema-tree-group-toggle')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  // Children are unmounted (not just hidden) when collapsed — see the conditional
  // render in SchemaRepoGroup.tsx — so toHaveCount(0) verifies real removal.
  await expect(groupLocator(page, 'JSON').getByText(id)).toHaveCount(0)

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(groupLocator(page, 'JSON').getByText(id)).toBeVisible()
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
async function setAceBody(page: Page, editorAriaLabel: string, value: string): Promise<void> {
  await page.evaluate(({ aria, next }) => {
    const node = document.querySelector(`[aria-label="${aria}"]`)
    // SAFETY: see comment above.
    const editor = (node as unknown as { env?: { editor: { setValue: (v: string, cursorPos?: number) => void } } } | null)?.env?.editor
    if (!editor) throw new Error('Ace editor not found')
    editor.setValue(next, -1)
  }, { aria: editorAriaLabel, next: value })
}

async function getAceBody(page: Page, editorAriaLabel: string): Promise<string> {
  return page.evaluate((aria) => {
    const node = document.querySelector(`[aria-label="${aria}"]`)
    // SAFETY: see setAceBody.
    const editor = (node as unknown as { env?: { editor: { getValue: () => string } } } | null)?.env?.editor
    if (!editor) throw new Error('Ace editor not found')
    return editor.getValue()
  }, editorAriaLabel)
}
