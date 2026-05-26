/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { expect, test, type Page } from '@playwright/test'

// SQLite serializes writes file-wide; serial mirrors schema-repo.spec.ts.
test.describe.configure({ mode: 'serial' })

const PREFIX = 'e2e'

// Tracked per worker; afterEach drops single-requests first (the BE refuses to
// delete a non-empty collection) and then their parent collections.
//
// No connector seeding here: buildSingleRequestPayload defaults producerName
// to 'local' when no connector is registered, so save/update/rename all work
// against a connector-less backend. Send flows live in the history+send spec.
const createdCollectionNames: string[] = []
const createdSingleRequestNames: string[] = []

test.afterEach(async ({ request }) => {
  const requests = createdSingleRequestNames.splice(0)
  const collections = createdCollectionNames.splice(0)
  // Sequential, not Promise.all: SQLite serializes writes file-wide; parallel
  // DELETEs trip [SQLITE_BUSY] which the catch silences but leaks rows.
  for (const name of requests) {
    await request.delete(`/api/single-requests/${encodeURIComponent(name)}`).catch(() => undefined)
  }
  for (const name of collections) {
    await request.delete(`/api/collection/${encodeURIComponent(name)}`).catch(() => undefined)
  }
})

test('save modal: opening from the header reveals the empty new-request form', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)

  // The header's "Save" button opens the modal because no single-request is
  // loaded yet (saveActionKind === 'save', not 'update').
  await dispatchHead(page).getByRole('button', { name: 'Save', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: 'Save single-request' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Single-request name')).toHaveValue('')
  // Save button stays disabled until both fields are non-empty after trim.
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
})

test('save modal: Save button stays disabled while either field is empty', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)
  await dispatchHead(page).getByRole('button', { name: 'Save', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: 'Save single-request' })
  const saveButton = dialog.getByRole('button', { name: 'Save', exact: true })
  const collectionInput = dialog.getByLabel('Collection (existing or new)')
  const requestInput = dialog.getByLabel('Single-request name')

  await expect(saveButton).toBeDisabled()

  await collectionInput.fill('only-collection')
  await expect(saveButton).toBeDisabled()

  await requestInput.fill('only-request')
  await expect(saveButton).toBeEnabled()

  // Whitespace-only goes through the same trim() guard as empty.
  await requestInput.fill('   ')
  await expect(saveButton).toBeDisabled()
})

test('save modal: submitting creates a brand-new collection and request', async ({ page }) => {
  const collectionName = trackUniqueCollection('save_new')
  const requestName = trackUniqueRequest('save_new_req')

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)

  await dispatchHead(page).getByRole('button', { name: 'Save', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Save single-request' })

  // Submit creates the collection on the fly (the saveSingleRequestWithValues
  // effect calls createCollectionApi when the name isn't already in state).
  await fillModalAndSubmit(dialog, collectionName, requestName)

  await expectRequestInTree(page, collectionName, requestName)
})

test('save modal: cancelling closes the modal without persisting anything', async ({ page, request }) => {
  // Use a name that we'd notice if it accidentally leaked through.
  const collectionName = trackUniqueCollection('cancel')
  const requestName = trackUniqueRequest('cancel_req')

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)

  await dispatchHead(page).getByRole('button', { name: 'Save', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Save single-request' })
  await dialog.getByLabel('Collection (existing or new)').fill(collectionName)
  await dialog.getByLabel('Single-request name').fill(requestName)

  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog).toHaveCount(0)

  // Server-side check: no collection was created, despite typed input.
  const collections = await request.get('/api/collection')
  const list = (await collections.json()) as Array<{ collectionName?: string; name?: string }>
  const names = list.map((entry) => entry.collectionName ?? entry.name)
  expect(names).not.toContain(collectionName)
})

test('save modal: header Close button is a second escape hatch alongside Cancel', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)
  await dispatchHead(page).getByRole('button', { name: 'Save', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: 'Save single-request' })
  // The header has a dedicated "Close" button — same onClose handler as
  // Cancel but a separate DOM path worth covering since users reach for it
  // when they don't want to scroll to the footer.
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).toHaveCount(0)
})

test('save modal: submitting into a pre-existing collection adds the request without duplicating the collection', async ({ page, request }) => {
  const collectionName = trackUniqueCollection('existing')
  const requestName = trackUniqueRequest('existing_req')

  await request.post('/api/collection', {
    data: { collectionName, collectionContext: {} },
  })

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)

  // The datalist of existing collections backs the input — pre-seeded
  // collection must be a valid auto-complete option after the initial load.
  await expect(collectionRow(page, collectionName)).toBeVisible()

  await dispatchHead(page).getByRole('button', { name: 'Save', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Save single-request' })
  await fillModalAndSubmit(dialog, collectionName, requestName)

  await expectRequestInTree(page, collectionName, requestName)
  // Still exactly one row with that name — proves the "if collection exists,
  // skip create" branch in saveSingleRequestWithValues.
  await expect(collectionRow(page, collectionName)).toHaveCount(1)
})

test('saved-requests: clicking a saved request loads it into the dispatch head', async ({ page }) => {
  const collectionName = trackUniqueCollection('load')
  const requestName = trackUniqueRequest('load_req')

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)
  await saveSingleRequestViaUi(page, collectionName, requestName)

  // Reload to clear the in-memory "this was just saved" selection — without
  // it, singleRequestSelected from the save flow would already light up the
  // loaded-from hint and the next click would no-op.
  await page.reload()
  await waitForDispatchReady(page)
  await collectionToggle(page, collectionName).click()
  await page.getByRole('button', { name: requestName, exact: true }).click()

  // The head's "Loaded single-request" hint is the canonical witness that
  // hydration completed.
  const head = dispatchHead(page)
  await expect(head.getByText('Loaded single-request:')).toBeVisible()
  await expect(head.locator('code', { hasText: requestName })).toBeVisible()
  await expect(head.locator('code', { hasText: collectionName })).toBeVisible()
  // Save action switches to "Update" once a request is selected, since
  // saveActionKind === 'update' for a loaded single-request.
  await expect(head.getByRole('button', { name: 'Update', exact: true })).toBeVisible()
})

test('saved-requests: clicking Update on a loaded request saves in-place without opening the modal', async ({ page }) => {
  const collectionName = trackUniqueCollection('update')
  const requestName = trackUniqueRequest('update_req')

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)
  await saveSingleRequestViaUi(page, collectionName, requestName)
  await page.getByRole('button', { name: requestName, exact: true }).click()
  await expect(dispatchHead(page).getByRole('button', { name: 'Update', exact: true })).toBeVisible()

  // The PATCH is the user-invisible thing that distinguishes update from save;
  // verifying it fires guarantees we exercised the patchSingleRequest branch
  // of saveSingleRequestWithValues (otherwise a phantom POST would still pass
  // the visible-name assertion).
  const patchResponse = page.waitForResponse(
    (res) => res.url().includes(`/api/single-requests/${encodeURIComponent(requestName)}`) && res.request().method() === 'PATCH' && res.ok(),
  )
  await dispatchHead(page).getByRole('button', { name: 'Update', exact: true }).click()
  await patchResponse

  // No modal — Update is the direct-save path.
  await expect(page.getByRole('dialog', { name: 'Save single-request' })).toHaveCount(0)
})

test('saved-requests: double-clicking a request name swaps it for a rename input', async ({ page }) => {
  const collectionName = trackUniqueCollection('rename_dbl')
  const requestName = trackUniqueRequest('rename_dbl_req')
  const nextName = `${requestName}_v2`
  // Track the new name too — rename = create-then-delete in the BE, so the
  // new one survives the test even though we never explicitly created it.
  createdSingleRequestNames.push(nextName)

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)
  await saveSingleRequestViaUi(page, collectionName, requestName)

  const requestButton = page.getByRole('button', { name: requestName, exact: true })
  await requestButton.dblclick()

  const renameInput = page.getByLabel('Rename collection')
  await expect(renameInput).toBeFocused()
  await renameInput.fill(nextName)
  await renameInput.press('Enter')

  // The renameSingleRequest effect calls refreshCollections after rollback-
  // safe create+delete; the old name must vanish from the tree.
  await expect(page.getByRole('button', { name: nextName, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: requestName, exact: true })).toHaveCount(0)
})

test('saved-requests: pressing Escape in the rename input restores the original name', async ({ page }) => {
  const collectionName = trackUniqueCollection('rename_esc')
  const requestName = trackUniqueRequest('rename_esc_req')

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)
  await saveSingleRequestViaUi(page, collectionName, requestName)

  await page.getByRole('button', { name: requestName, exact: true }).dblclick()
  const renameInput = page.getByLabel('Rename collection')
  await renameInput.fill('this-should-be-discarded')
  await renameInput.press('Escape')

  // Reducer's `requestRenameCancelled` resets editingRequest to null without
  // dispatching the rename effect — old name stays, no API call ever fires.
  await expect(page.getByRole('button', { name: requestName, exact: true })).toBeVisible()
  await expect(page.getByLabel('Rename collection')).toHaveCount(0)
})

test('saved-requests: starting rename via the actions menu offers the same input', async ({ page }) => {
  const collectionName = trackUniqueCollection('rename_menu')
  const requestName = trackUniqueRequest('rename_menu_req')
  const nextName = `${requestName}_v2`
  createdSingleRequestNames.push(nextName)

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)
  await saveSingleRequestViaUi(page, collectionName, requestName)

  await page.getByRole('button', { name: `Actions for ${requestName}`, exact: true }).click()
  await page.getByRole('menuitem', { name: 'Rename' }).click()

  const renameInput = page.getByLabel('Rename collection')
  await renameInput.fill(nextName)
  await renameInput.press('Enter')

  await expect(page.getByRole('button', { name: nextName, exact: true })).toBeVisible()
})

test('saved-requests: deleting via the actions menu removes the request from the tree', async ({ page }) => {
  const collectionName = trackUniqueCollection('delete')
  const requestName = trackUniqueRequest('delete_req')

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)
  await saveSingleRequestViaUi(page, collectionName, requestName)

  await page.getByRole('button', { name: `Actions for ${requestName}`, exact: true }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()

  await expect(page.getByRole('button', { name: requestName, exact: true })).toHaveCount(0)
  // Collection survives — only the leaf request was removed.
  await expect(collectionRow(page, collectionName)).toBeVisible()
})

test('saved-requests: a saved request survives a hard page reload', async ({ page }) => {
  const collectionName = trackUniqueCollection('persist')
  const requestName = trackUniqueRequest('persist_req')

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)
  await saveSingleRequestViaUi(page, collectionName, requestName)
  await expectRequestInTree(page, collectionName, requestName)

  await page.reload()
  await waitForDispatchReady(page)

  // The tree state is rehydrated from /api/collection + /api/single-requests
  // on init; persistence is what we're actually asserting here.
  await expect(collectionRow(page, collectionName)).toBeVisible()
  await collectionToggle(page, collectionName).click()
  await expect(page.getByRole('button', { name: requestName, exact: true })).toBeVisible()
})

function trackUniqueCollection(kind: string): string {
  const name = `${PREFIX}_col_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  createdCollectionNames.push(name)
  return name
}

function trackUniqueRequest(kind: string): string {
  const name = `${PREFIX}_req_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  createdSingleRequestNames.push(name)
  return name
}

function dispatchHead(page: Page) {
  return page.locator('.dispatch-request-head')
}

function collectionsPanel(page: Page) {
  return page.locator('aside.dispatch-collections-card')
}

function collectionRow(page: Page, collectionName: string) {
  return collectionsPanel(page).locator('article.dispatch-tree-node', {
    has: page.getByRole('button', { name: `Actions for ${collectionName}`, exact: true }),
  })
}

function collectionToggle(page: Page, collectionName: string) {
  return collectionRow(page, collectionName).locator('.dispatch-tree-toggle').first()
}

async function waitForDispatchReady(page: Page) {
  // Collections panel Refresh button enables once the initial GETs resolve —
  // matches the gate used in message-dispatch.collections.spec.ts.
  await expect(collectionsPanel(page).getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
}

async function fillModalAndSubmit(
  dialog: ReturnType<Page['getByRole']>,
  collectionName: string,
  requestName: string,
) {
  await dialog.getByLabel('Collection (existing or new)').fill(collectionName)
  await dialog.getByLabel('Single-request name').fill(requestName)
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  // Modal closes on success — that's the only signal that the underlying
  // POST/PATCH resolved without an error toast.
  await expect(dialog).toHaveCount(0)
}

async function saveSingleRequestViaUi(page: Page, collectionName: string, requestName: string) {
  await dispatchHead(page).getByRole('button', { name: 'Save', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Save single-request' })
  await fillModalAndSubmit(dialog, collectionName, requestName)
  await expectRequestInTree(page, collectionName, requestName)
}

async function expectRequestInTree(page: Page, collectionName: string, requestName: string) {
  const row = collectionRow(page, collectionName)
  await expect(row).toBeVisible()
  // Expand the parent if collapsed — request children are unmounted until
  // the collection node is expanded.
  const toggle = collectionToggle(page, collectionName)
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click()
  }
  await expect(page.getByRole('button', { name: requestName, exact: true })).toBeVisible()
}
