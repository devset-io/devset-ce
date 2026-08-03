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

// SQLite serializes writes file-wide; serial mirrors the other dispatch specs.
test.describe.configure({ mode: 'serial' })

const PREFIX = 'e2e'

const createdCollectionNames: string[] = []
const createdSingleRequestNames: string[] = []

test.afterEach(async ({ request }) => {
  // Reset the shared, singleton dispatch workspace so saved-request tabs persisted
  // by one test don't leak into the next (localStorage is per-context, but the
  // backend row is global).
  await request
    .put('/api/dispatch-workspace', {
      headers: { 'Content-Type': 'application/json' },
      data: { activeTabId: null, tabs: [] },
    })
    .catch(() => undefined)

  const requests = createdSingleRequestNames.splice(0)
  const collections = createdCollectionNames.splice(0)
  for (const name of requests) {
    await request.delete(`/api/single-requests/${encodeURIComponent(name)}`).catch(() => undefined)
  }
  for (const name of collections) {
    await request.delete(`/api/collection/${encodeURIComponent(name)}`).catch(() => undefined)
  }
})

test('a fresh workspace starts with a single scratch tab', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)

  await expect(dispatchTab(page, 'Untitled')).toBeVisible()
})

test('clicking New tab opens an additional scratch tab', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)

  await newTabButton(page).click()

  await expect(tabBar(page).getByRole('button', { name: 'Untitled', exact: true })).toHaveCount(2)
})

test('saving a request keeps its loaded tab open across a reload', async ({ page }) => {
  const collectionName = trackUniqueCollection('open')
  const requestName = trackUniqueRequest('open_req')

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)
  // Saving associates the active tab with the request (its title becomes the
  // request name); that tab must survive a hard reload.
  await saveSingleRequestViaUi(page, collectionName, requestName)
  await page.reload()
  await waitForDispatchReady(page)

  // Exactly one restored tab for the request — not a duplicate…
  await expect(dispatchTab(page, requestName)).toHaveCount(1)
  await expect(dispatchTab(page, requestName)).toBeVisible()
  // …and the head shows it as the loaded single-request.
  await expect(dispatchHead(page).getByText('Loaded single-request:')).toBeVisible()
  await expect(dispatchHead(page).getByRole('button', { name: 'Update', exact: true })).toBeVisible()
})

test('opening an already-open saved request yields a second independent tab', async ({ page }) => {
  const collectionName = trackUniqueCollection('twice')
  const requestName = trackUniqueRequest('twice_req')

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)
  await saveSingleRequestViaUi(page, collectionName, requestName)
  await page.reload()
  await waitForDispatchReady(page)

  // Saving + reload restores the request into one tab; opening it again from the
  // tree must add a second, independent tab (tabs are never de-duplicated by ref).
  await expect(dispatchTab(page, requestName)).toHaveCount(1)
  await openTreeRequest(page, collectionName, requestName)

  await expect(dispatchTab(page, requestName)).toHaveCount(2)
})

test('closing the active tab activates a neighbour', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)
  await newTabButton(page).click()
  await expect(tabBar(page).getByRole('button', { name: 'Untitled', exact: true })).toHaveCount(2)

  await closeTabButton(page, 'Untitled').first().click()

  await expect(tabBar(page).getByRole('button', { name: 'Untitled', exact: true })).toHaveCount(1)
})

test('switching tabs restores each tab’s own payload', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)

  const firstBody = '{"tab":"one"}'
  const secondBody = '{"tab":"two"}'

  // Tab 1 gets one payload; a new scratch tab gets a different one. The payload
  // editor is always present (no connector needed) and dispatches synchronously.
  await setAceBody(page, 'JSON payload editor', firstBody)
  await newTabButton(page).click()
  await setAceBody(page, 'JSON payload editor', secondBody)

  // Back to tab 1 — its payload must return, not leak tab 2's value.
  await dispatchTab(page, 'Untitled').first().click()

  await expect.poll(() => getAceBody(page, 'JSON payload editor')).toBe(firstBody)
})

test('Update asks for confirmation and patches the source request when accepted', async ({ page }) => {
  const collectionName = trackUniqueCollection('update')
  const requestName = trackUniqueRequest('update_req')

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)
  await saveSingleRequestViaUi(page, collectionName, requestName)
  await page.reload()
  await waitForDispatchReady(page)
  await openTreeRequest(page, collectionName, requestName)
  await expect(dispatchHead(page).getByRole('button', { name: 'Update', exact: true })).toBeVisible()

  // Update opens the "overwrite the source request?" confirmation modal.
  await dispatchHead(page).getByRole('button', { name: 'Update', exact: true }).click()
  const confirmDialog = page.getByRole('dialog', { name: 'Confirm single-request update' })
  await expect(confirmDialog).toBeVisible()

  const patch = page.waitForResponse(
    (res) =>
      res.url().includes(`/api/single-requests/${encodeURIComponent(requestName)}`) &&
      res.request().method() === 'PATCH' &&
      res.ok(),
  )
  await confirmDialog.getByRole('button', { name: 'Update', exact: true }).click()
  await patch
})

test('dismissing the Update confirmation does not save', async ({ page }) => {
  const collectionName = trackUniqueCollection('cancel')
  const requestName = trackUniqueRequest('cancel_req')

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)
  await saveSingleRequestViaUi(page, collectionName, requestName)
  await page.reload()
  await waitForDispatchReady(page)
  await openTreeRequest(page, collectionName, requestName)

  let patched = false
  page.on('response', (res) => {
    if (res.url().includes('/api/single-requests') && res.request().method() === 'PATCH') patched = true
  })
  await dispatchHead(page).getByRole('button', { name: 'Update', exact: true }).click()
  const confirmDialog = page.getByRole('dialog', { name: 'Confirm single-request update' })
  await confirmDialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(confirmDialog).toHaveCount(0)

  // Give any (unwanted) request a chance to fire before asserting it did not.
  await expect(dispatchHead(page).getByRole('button', { name: 'Update', exact: true })).toBeVisible()
  expect(patched).toBe(false)
})

test('a request can be saved without picking a collection (defaults to Uncategorized)', async ({ page }) => {
  const requestName = trackUniqueRequest('nocol_req')
  createdCollectionNames.push('Uncategorized')

  await page.goto('/message-dispatch')
  await waitForDispatchReady(page)

  await dispatchHead(page).getByRole('button', { name: 'Save', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Save single-request' })
  // The modal pre-fills the collection with an existing one — clear it to prove
  // that saving with NO collection still works (and enables the Save button).
  await dialog.getByLabel('Collection (existing or new)').fill('')
  await dialog.getByLabel('Single-request name').fill(requestName)
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).toHaveCount(0)

  // The request lands in the auto-created "Uncategorized" collection.
  await expect(collectionRow(page, 'Uncategorized')).toBeVisible()
})

// ── locators ────────────────────────────────────────────────────────────────

function tabBar(page: Page) {
  return page.locator('.dispatch-tabbar')
}

function dispatchTab(page: Page, title: string) {
  return tabBar(page).getByRole('button', { name: title, exact: true })
}

function newTabButton(page: Page) {
  return tabBar(page).getByRole('button', { name: 'New tab', exact: true })
}

function closeTabButton(page: Page, title: string) {
  return tabBar(page).getByRole('button', { name: `Close tab: ${title}`, exact: true })
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

// Scoped to the tree so it never collides with the same-named tab in the bar.
function treeRequest(page: Page, collectionName: string, requestName: string): Locator {
  return collectionsPanel(page).getByRole('button', { name: requestName, exact: true })
}

// Request children are unmounted until their collection is expanded — a hard
// reload collapses the tree, so re-expand before clicking the request.
async function openTreeRequest(page: Page, collectionName: string, requestName: string) {
  const toggle = collectionToggle(page, collectionName)
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click()
  }
  await treeRequest(page, collectionName, requestName).click()
}

// ── helpers ───────────────────────────────────────────────────────────────

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

async function waitForDispatchReady(page: Page) {
  await expect(collectionsPanel(page).getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
}

// Ace editor helpers — mirror message-dispatch.payload-and-schema.spec.ts.
async function setAceBody(page: Page, editorAriaLabel: string, value: string): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate((aria) => {
        const node = document.querySelector(`[aria-label="${aria}"]`)
        return Boolean((node as unknown as { env?: { editor?: unknown } } | null)?.env?.editor)
      }, editorAriaLabel),
    )
    .toBe(true)

  await page.evaluate(
    ({ aria, next }) => {
      const node = document.querySelector(`[aria-label="${aria}"]`)
      // SAFETY: Ace exposes its editor instance on the DOM node's `env.editor`.
      const editor = (node as unknown as { env?: { editor: { setValue: (v: string, cursorPos?: number) => void } } } | null)?.env?.editor
      if (!editor) throw new Error('Ace editor not found')
      editor.setValue(next, -1)
    },
    { aria: editorAriaLabel, next: value },
  )
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

async function saveSingleRequestViaUi(page: Page, collectionName: string, requestName: string) {
  await dispatchHead(page).getByRole('button', { name: 'Save', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Save single-request' })
  await dialog.getByLabel('Collection (existing or new)').fill(collectionName)
  await dialog.getByLabel('Single-request name').fill(requestName)
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(collectionRow(page, collectionName)).toBeVisible()
  const toggle = collectionToggle(page, collectionName)
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click()
  }
}
