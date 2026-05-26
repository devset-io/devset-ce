/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// SQLite serializes writes file-wide; serial mirrors schema-repo.spec.ts.
//
// Real Kafka dispatches happen here, so this spec is the slowest of the
// suite. Tests share a single seeded connector + history entry to amortize
// the Kafka producer handshake.
test.describe.configure({ mode: 'serial' })

const KAFKA_BOOTSTRAP = process.env.E2E_KAFKA_BOOTSTRAP ?? 'kafka:29092'

let kafkaConnectorName: string | null = null
// Anchor history entry created in beforeAll via a real dispatch. Used as the
// canonical entry for preview/load/filter tests so they don't each pay the
// Kafka send latency. Seeded in beforeAll (not inside a test) so that a
// seeding failure fails *all* downstream tests loudly instead of silently
// skipping them — review feedback flagged the old test.skip(true) pattern as
// a regression-hiding trap in CI.
let anchorTopic: string | null = null

test.beforeAll(async ({ browser, request }) => {
  kafkaConnectorName = await ensureKafkaConnector(request)

  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8082'
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  try {
    const topic = uniqueTopic('anchor')
    await page.goto('/message-dispatch')
    await waitForRequestReady(page)
    await selectKafkaConnector(page)
    await page.getByLabel('Topic').fill(topic)
    const sendBtn = page.getByRole('button', { name: 'Send message', exact: true })
    await expect(sendBtn).toBeEnabled({ timeout: 15_000 })
    const executeResponse = page.waitForResponse(
      (res) => res.url().includes('/api/single-step/execute') && res.request().method() === 'POST' && res.ok(),
    )
    await sendBtn.click()
    await executeResponse
    anchorTopic = topic
  } finally {
    await context.close()
  }
})

test.afterAll(async ({ request }) => {
  if (kafkaConnectorName) {
    await request
      .delete(`/api/connectors/configurations/kafka/${encodeURIComponent(kafkaConnectorName)}`)
      .catch(() => undefined)
    kafkaConnectorName = null
  }
})

test('send: dispatching a Kafka JSON message creates a history entry visible in the panel', async ({ page }) => {
  // Uses its own topic — the beforeAll-seeded anchor exists only so the rest
  // of the spec can run independently of this test.
  const topic = uniqueTopic('send_kafka')

  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await selectKafkaConnector(page)

  await page.getByLabel('Topic').fill(topic)

  // Send button enables when the producer-connected SSE arrives and the
  // routing target (topic) is present — that's the real "ready to dispatch"
  // signal, no fixed sleep.
  const sendBtn = page.getByRole('button', { name: 'Send message', exact: true })
  await expect(sendBtn).toBeEnabled({ timeout: 15_000 })

  // Wait for the BE's POST /single-step/execute to return a 2xx — the
  // tightest signal that the producer-side dispatch actually committed
  // rather than just optimistically updating UI.
  const executeResponse = page.waitForResponse(
    (res) => res.url().includes('/api/single-step/execute') && res.request().method() === 'POST' && res.ok(),
  )
  await sendBtn.click()
  await executeResponse

  await openHistoryPanel(page)
  // The history entry's destination line embeds the topic — most stable
  // anchor (producer name is generated, runId is opaque).
  await expect(historyPanel(page).getByText(topic, { exact: false }).first()).toBeVisible({
    timeout: 30_000,
  })
})

test('send: dispatching without a Kafka topic surfaces the topic-required error', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await selectKafkaConnector(page)

  // canSend in useMessageDispatchRequestCard only gates on connector/proto
  // state, NOT on the topic — the topic guard fires from resolveDispatchDraft
  // when the user actually clicks Send. We let the button enable, click, and
  // assert the inline error (rendered next to the dispatch request card as
  // `props.sendError`).
  const sendBtn = page.getByRole('button', { name: 'Send message', exact: true })
  await expect(sendBtn).toBeEnabled({ timeout: 15_000 })
  await expect(page.getByLabel('Topic')).toHaveValue('')

  await sendBtn.click()

  // Kafka topic required → sendFailed dispatched → sendError shown inline.
  // Scope to main to exclude the toast notification that mirrors the same text.
  await expect(page.getByRole('main').getByText('Kafka topic is required.')).toBeVisible({ timeout: 5_000 })
})

test('history panel: the History head button toggles the panel open and closed', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)

  const toggle = page.getByRole('button', { name: 'History', exact: true })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(historyPanel(page)).toHaveCount(0)

  await toggle.click()

  // After opening the button text flips to "Hide history" (labels.hideHistory)
  // and aria-expanded mirrors the panel state.
  await expect(page.getByRole('button', { name: 'Hide history' })).toHaveAttribute('aria-expanded', 'true')
  await expect(historyPanel(page)).toBeVisible()

  await page.getByRole('button', { name: 'Hide history' }).click()
  await expect(historyPanel(page)).toHaveCount(0)
})

test('history panel: Preview opens a modal with the entry payload and Close dismisses it', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await openHistoryPanel(page)

  // Multiple entries may exist in the panel from prior runs — scope to the
  // anchor topic's row to guarantee we preview the entry we just created.
  const row = historyEntryRow(page, anchorTopic!)
  await row.getByRole('button', { name: 'Preview' }).click()

  const modal = page.getByRole('dialog', { name: 'History entry preview' })
  await expect(modal).toBeVisible()
  // The modal's body shows the topic field — the anchor topic must appear in it.
  await expect(modal.getByText(anchorTopic!, { exact: false })).toBeVisible()

  await modal.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(modal).toHaveCount(0)
})

test('history panel: Load on an entry populates the dispatch head with the loaded-from hint', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await openHistoryPanel(page)

  await historyEntryRow(page, anchorTopic!).getByRole('button', { name: 'Load' }).click()

  // After load the request head shows the "Loaded from history" hint with the
  // history entry's id (we don't compare the id since it's random — the
  // <code> wrapping is the canonical witness for the hint).
  const head = page.locator('.dispatch-request-head')
  await expect(head.getByText('Loaded from history:')).toBeVisible()
  // Topic field is repopulated from the history entry's payload.
  await expect(page.getByLabel('Topic')).toHaveValue(anchorTopic!)
})

test('history panel: typing into Search narrows the visible entries', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await openHistoryPanel(page)

  const search = historyPanel(page).getByLabel('Search')

  // Bogus query — no entry contains this token, so the filtered list shows
  // the "empty filtered" branch.
  await search.fill('definitely-no-such-entry-zzz')
  await expect(historyPanel(page).getByText('No results for selected filters.')).toBeVisible()

  // Real topic — the anchor entry comes back.
  await search.fill(anchorTopic!)
  await expect(historyEntryRow(page, anchorTopic!)).toBeVisible()
})

test('history panel: Clear resets the filter inputs and brings hidden entries back', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await openHistoryPanel(page)

  // Apply a clearly-narrowing filter, then prove Clear undoes it.
  await historyPanel(page).getByLabel('Search').fill('definitely-no-such-entry-zzz')
  await historyPanel(page).getByLabel('Broker').selectOption('rabbit')
  await expect(historyPanel(page).getByLabel('Search')).toHaveValue('definitely-no-such-entry-zzz')

  await historyPanel(page).getByRole('button', { name: 'Clear' }).click()

  await expect(historyPanel(page).getByLabel('Search')).toHaveValue('')
  await expect(historyPanel(page).getByLabel('Broker')).toHaveValue('all')
  await expect(historyEntryRow(page, anchorTopic!)).toBeVisible()
})

test('history panel: changing the Broker filter to a non-matching type hides the entry', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await openHistoryPanel(page)

  // The anchor entry is Kafka — selecting "rabbit" must hide it.
  await historyPanel(page).getByLabel('Broker').selectOption('rabbit')
  await expect(historyEntryRow(page, anchorTopic!)).toHaveCount(0)

  // Flipping the filter back to "all" brings it back without re-fetching.
  await historyPanel(page).getByLabel('Broker').selectOption('all')
  await expect(historyEntryRow(page, anchorTopic!)).toBeVisible()
})

test('history panel: changing the Format filter to PROTOBUF hides a JSON entry', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await openHistoryPanel(page)

  await historyPanel(page).getByLabel('Format').selectOption('application/x-protobuf')
  await expect(historyEntryRow(page, anchorTopic!)).toHaveCount(0)

  await historyPanel(page).getByLabel('Format').selectOption('all')
  await expect(historyEntryRow(page, anchorTopic!)).toBeVisible()
})

test('history panel: clicking Refresh fires another /single-step/history fetch', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await openHistoryPanel(page)

  // The panel hydrates on mount; clicking Refresh must trigger a second GET
  // against the same endpoint. We listen for the response *before* the click
  // and await it — Playwright auto-times-out if no fetch fires.
  const refetch = page.waitForResponse(
    (res) => res.url().includes('/api/single-step/history') && res.request().method() === 'GET' && res.ok(),
  )
  await historyPanel(page).getByRole('button', { name: 'Refresh', exact: true }).click()
  await refetch
})

async function ensureKafkaConnector(request: APIRequestContext): Promise<string> {
  const listed = await request.get('/api/connectors/configurations').catch(() => null)
  if (listed?.ok()) {
    const payload = (await listed.json()) as Array<{ type?: string; name?: string }>
    const existing = payload.find((entry) => entry.type === 'kafka' && typeof entry.name === 'string')
    if (existing?.name) return existing.name
  }

  const name = `e2e-md-send-kafka-${Date.now()}`
  const created = await request.post('/api/connectors/configurations', {
    data: {
      type: 'kafka',
      name,
      bootstrapServers: KAFKA_BOOTSTRAP,
      username: null,
      password: null,
    },
  })
  if (!created.ok()) {
    throw new Error(`could not seed kafka connector: ${created.status()} ${await created.text()}`)
  }
  return name
}

function uniqueTopic(kind: string): string {
  return `e2e-md-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function historyPanel(page: Page) {
  return page.locator('aside.dispatch-history-card')
}

function historyEntryRow(page: Page, topic: string) {
  return historyPanel(page).locator('article.dispatch-history-item').filter({ hasText: topic })
}

async function waitForRequestReady(page: Page) {
  await expect(page.getByLabel('Connector')).toBeEnabled()
}

async function selectKafkaConnector(page: Page) {
  if (!kafkaConnectorName) throw new Error('kafka connector not seeded')
  await page.getByLabel('Connector').selectOption(kafkaConnectorName)
  await expect(page.getByLabel('Connector')).toHaveValue(kafkaConnectorName)
}

async function openHistoryPanel(page: Page) {
  const isOpen = await page
    .getByRole('button', { name: 'Hide history' })
    .isVisible()
    .catch(() => false)
  if (!isOpen) {
    await page.getByRole('button', { name: 'History', exact: true }).click()
  }
  await expect(historyPanel(page)).toBeVisible()
}
