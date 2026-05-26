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

// SQLite serializes writes file-wide; parallel workers on the same backend
// trip [SQLITE_BUSY]. Mirror schema-repo.spec.ts and run serially.
test.describe.configure({ mode: 'serial' })

const COLLECTION_ID_PREFIX = 'e2e'

// Tracked per worker. Best-effort DELETE in afterEach so a failed test does
// not leave dangling collections on the shared backend.
const createdCollectionNames: string[] = []

test.afterEach(async ({ request }) => {
  const names = createdCollectionNames.splice(0)
  // Sequential, not Promise.all: SQLite serializes writes file-wide and
  // parallel DELETEs trip [SQLITE_BUSY] (the catch silences the error so the
  // test still passes — clones may have already been removed via a UI delete).
  for (const name of names) {
    await request.delete(`/api/collection/${encodeURIComponent(name)}`).catch(() => undefined)
  }
})

test('message dispatch collections: creating a collection adds it to the tree', async ({ page }) => {
  const name = trackUniqueName('create')

  await page.goto('/message-dispatch')
  await waitForCollectionsReady(page)

  await page.getByLabel('New collection name').fill(name)
  await page.getByRole('button', { name: 'Add', exact: true }).click()

  // The input clears on success and the new row appears in the tree.
  await expect(collectionRow(page, name)).toBeVisible()
  await expect(page.getByLabel('New collection name')).toHaveValue('')
})

test('message dispatch collections: Add button stays disabled while the name input is empty or whitespace', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForCollectionsReady(page)

  const addButton = page.getByRole('button', { name: 'Add', exact: true })
  const input = page.getByLabel('New collection name')

  await expect(addButton).toBeDisabled()

  // Whitespace-only counts as empty via the trim() guard in the panel.
  await input.fill('   ')
  await expect(addButton).toBeDisabled()

  // Any non-whitespace character enables the button — proves the guard is on
  // trim().length, not raw length.
  await input.fill('x')
  await expect(addButton).toBeEnabled()
})

test('message dispatch collections: toggling a collection hides and reveals the empty-requests hint', async ({ page }) => {
  const name = trackUniqueName('expand')

  await page.goto('/message-dispatch')
  await createCollectionUi(page, name)

  const row = collectionRow(page, name)
  const toggle = row.locator('.dispatch-tree-toggle').first()

  // Newly-created collections are auto-selected, and `isExpanded` is derived
  // as `selectedCollectionName === collection.collectionName` — so the row
  // mounts already expanded with its empty-requests hint visible.
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(row.getByText('No single-requests.')).toBeVisible()

  // Collapsing must unmount the children, not just hide them — protects the
  // conditional render in DispatchCollectionsPanel.
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(row.getByText('No single-requests.')).toHaveCount(0)

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(row.getByText('No single-requests.')).toBeVisible()
})

test('message dispatch collections: opening the actions menu reveals Clone, Edit context and Delete', async ({ page }) => {
  const name = trackUniqueName('menu')

  await page.goto('/message-dispatch')
  await createCollectionUi(page, name)

  const trigger = page.getByRole('button', { name: `Actions for ${name}`, exact: true })
  await trigger.click()

  // role=menu has aria-label `${labels.collectionActions} ${collectionName}`.
  const menu = page.getByRole('menu', { name: `Collection actions ${name}` })
  await expect(menu.getByRole('menuitem', { name: 'Clone' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Edit context' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeVisible()
})

test('message dispatch collections: cloning a collection creates a "-clone" twin', async ({ page }) => {
  const name = trackUniqueName('clone')
  const cloneName = `${name}-clone`
  // Cloning happens server-side, so we have to track the new name for cleanup
  // even though the test never types it explicitly.
  createdCollectionNames.push(cloneName)

  await page.goto('/message-dispatch')
  await createCollectionUi(page, name)

  await page.getByRole('button', { name: `Actions for ${name}`, exact: true }).click()
  await page.getByRole('menuitem', { name: 'Clone' }).click()

  await expect(collectionRow(page, cloneName)).toBeVisible()
  // The original survives the clone — cloneCollection only adds, never moves.
  await expect(collectionRow(page, name)).toBeVisible()
})

test('message dispatch collections: deleting via the actions menu removes the row', async ({ page }) => {
  const name = trackUniqueName('delete')

  await page.goto('/message-dispatch')
  await createCollectionUi(page, name)
  await expect(collectionRow(page, name)).toBeVisible()

  await page.getByRole('button', { name: `Actions for ${name}`, exact: true }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()

  // No native confirm dialog — deleteCollection in the effects file calls the
  // API directly. The row must be gone after refreshCollections resolves.
  await expect(collectionRow(page, name)).toHaveCount(0)
})

test('message dispatch collections: refreshing reflects collections added by another client', async ({ page, request }) => {
  const name = trackUniqueName('refresh')

  await page.goto('/message-dispatch')
  await waitForCollectionsReady(page)

  // The panel has not seen this collection yet — it was created over the API
  // after the initial load.
  const createResponse = await request.post('/api/collection', {
    data: { collectionName: name, collectionContext: {} },
  })
  expect(createResponse.ok()).toBeTruthy()
  await expect(collectionRow(page, name)).toHaveCount(0)

  // The Refresh button (collections panel, not history — history panel is
  // closed by default) re-fetches and brings the new row in.
  await collectionsPanel(page).getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(collectionRow(page, name)).toBeVisible()
})

test('message dispatch collections: saving a literal field shows the context badge with the field count', async ({ page }) => {
  const name = trackUniqueName('ctx_save')

  await page.goto('/message-dispatch')
  await createCollectionUi(page, name)

  const dialog = await openContextModal(page, name)

  await dialog.getByRole('button', { name: '+ Add field' }).click()
  await dialog.getByPlaceholder('field name').fill('tenantId')
  // The literal-mode input is the only one rendered with placeholder "value"
  // (path/fn modes use different placeholders); QueryValueEditor defaults to
  // literal kind for new rows.
  await dialog.getByPlaceholder('value').fill('acme-co')

  const patchResponse = page.waitForResponse(
    (res) => res.url().includes(`/api/collection/${encodeURIComponent(name)}`) && res.request().method() === 'PATCH' && res.ok(),
  )
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await patchResponse

  // Badge aria-label is `${contextFieldsTitle}: ${count}` — exposes the
  // contextFieldCount selector output directly to the test.
  await expect(
    collectionRow(page, name).getByRole('button', { name: 'Collection context fields: 1' }),
  ).toBeVisible()
})

test('message dispatch collections: cancelling the context modal discards unsaved field rows', async ({ page }) => {
  const name = trackUniqueName('ctx_cancel')

  await page.goto('/message-dispatch')
  await createCollectionUi(page, name)
  const dialog = await openContextModal(page, name)

  await dialog.getByRole('button', { name: '+ Add field' }).click()
  await dialog.getByPlaceholder('field name').fill('shouldBeDiscarded')

  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()

  // No PATCH ever fired — badge must not appear, and re-opening the modal
  // must show the empty state.
  await expect(
    collectionRow(page, name).getByRole('button', { name: /^Collection context fields:/ }),
  ).toHaveCount(0)

  const reopened = await openContextModal(page, name)
  await expect(reopened.getByText('No fields. Add the first one.')).toBeVisible()
})

test('message dispatch collections: removing the only field saves an empty context and clears the badge', async ({ page, request }) => {
  const name = trackUniqueName('ctx_remove')

  // Seed via the API so the test starts from "collection with 1 field" without
  // first walking the add-field-then-save flow that's already covered above.
  await request.post('/api/collection', {
    data: { collectionName: name, collectionContext: { region: 'eu-west' } },
  })
  createdCollectionNames.push(name)

  await page.goto('/message-dispatch')
  await waitForCollectionsReady(page)
  await expect(
    collectionRow(page, name).getByRole('button', { name: 'Collection context fields: 1' }),
  ).toBeVisible()

  const dialog = await openContextModal(page, name)
  await dialog.getByRole('button', { name: 'Remove field' }).click()

  const patchResponse = page.waitForResponse(
    (res) => res.url().includes(`/api/collection/${encodeURIComponent(name)}`) && res.request().method() === 'PATCH' && res.ok(),
  )
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await patchResponse

  // Badge gone — contextFieldCount === 0 hides the button entirely (the
  // panel's `contextFieldCount > 0 ?` guard).
  await expect(
    collectionRow(page, name).getByRole('button', { name: /^Collection context fields:/ }),
  ).toHaveCount(0)
})

test('message dispatch collections: switching between literal / var / fn modes activates the chosen pill', async ({ page }) => {
  const name = trackUniqueName('ctx_mode')

  await page.goto('/message-dispatch')
  await createCollectionUi(page, name)
  const dialog = await openContextModal(page, name)

  await dialog.getByRole('button', { name: '+ Add field' }).click()

  // New rows start in literal mode — QueryValueEditor's `MODE_BTN_ACTIVE` is
  // styled with bg-[var(--brand)] text-white, which we surface via class
  // assertion (no aria-pressed exposed today).
  const literalBtn = dialog.getByRole('button', { name: 'literal', exact: true })
  const varBtn = dialog.getByRole('button', { name: 'var', exact: true })
  const fnBtn = dialog.getByRole('button', { name: 'fn', exact: true })

  await expect(literalBtn).toHaveClass(/bg-\[var\(--brand\)\]/)
  await expect(varBtn).not.toHaveClass(/bg-\[var\(--brand\)\]/)

  await varBtn.click()
  await expect(varBtn).toHaveClass(/bg-\[var\(--brand\)\]/)
  await expect(literalBtn).not.toHaveClass(/bg-\[var\(--brand\)\]/)

  await fnBtn.click()
  await expect(fnBtn).toHaveClass(/bg-\[var\(--brand\)\]/)
  await expect(varBtn).not.toHaveClass(/bg-\[var\(--brand\)\]/)
})

test('message dispatch collections: closing the context modal via the header Close button keeps the panel intact', async ({ page }) => {
  const name = trackUniqueName('ctx_close')

  await page.goto('/message-dispatch')
  await createCollectionUi(page, name)
  await openContextModal(page, name)

  // The header has a Close button and the footer has Cancel — both close the
  // modal. This case targets the header path (different click handler from
  // Cancel, even though they share onClose).
  await page
    .getByRole('dialog', { name: 'Edit collection context' })
    .getByRole('button', { name: 'Close', exact: true })
    .click()

  await expect(page.getByRole('dialog', { name: 'Edit collection context' })).toHaveCount(0)
  // Underlying collection still listed — closing the modal must not nuke the
  // tree state.
  await expect(collectionRow(page, name)).toBeVisible()
})

function trackUniqueName(kind: string): string {
  const name = `${COLLECTION_ID_PREFIX}_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  createdCollectionNames.push(name)
  return name
}

function collectionsPanel(page: Page) {
  return page.locator('aside.dispatch-collections-card')
}

function collectionRow(page: Page, collectionName: string) {
  // Scope to the unique action button — the dispatch tree's name span is
  // truncated/title-driven and not uniquely addressable by text in isolation.
  // exact:true is essential: accessible-name matching is a substring search,
  // so a row for "X" would also match the "Actions for X-clone" button on the
  // sibling clone row (see the cloning test, which keeps both rows alive).
  return collectionsPanel(page).locator('article.dispatch-tree-node', {
    has: page.getByRole('button', { name: `Actions for ${collectionName}`, exact: true }),
  })
}

async function waitForCollectionsReady(page: Page) {
  // The "Refresh" button only enables once the initial /api/collection GET
  // resolves — a tighter signal than waiting on the heading alone.
  await expect(collectionsPanel(page).getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
}

async function createCollectionUi(page: Page, collectionName: string) {
  await waitForCollectionsReady(page)
  await page.getByLabel('New collection name').fill(collectionName)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(collectionRow(page, collectionName)).toBeVisible()
}

async function openContextModal(page: Page, collectionName: string) {
  await page.getByRole('button', { name: `Actions for ${collectionName}`, exact: true }).click()
  await page.getByRole('menuitem', { name: 'Edit context' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit collection context' })
  await expect(dialog).toBeVisible()
  return dialog
}
