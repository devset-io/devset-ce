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
test.describe.configure({ mode: 'serial' })

const KAFKA_BOOTSTRAP = process.env.E2E_KAFKA_BOOTSTRAP ?? 'kafka:29092'
const RABBIT_HOST = process.env.E2E_RABBIT_HOST ?? 'rabbitmq'
const RABBIT_PORT = Number(process.env.E2E_RABBIT_PORT ?? 5672)

// Connector pair registered once per spec run — every test in this file
// expects at least one kafka *and* one rabbit option in the dropdown so
// switching between them can be exercised.
let kafkaConnectorName: string | null = null
let rabbitConnectorName: string | null = null

test.beforeAll(async ({ request }) => {
  kafkaConnectorName = await ensureKafkaConnector(request)
  rabbitConnectorName = await ensureRabbitConnector(request)
})

test.afterAll(async ({ request }) => {
  // Connectors are deleted in reverse-create order; the catch silences a 404
  // when a previous failed run already removed them.
  if (rabbitConnectorName) {
    await request
      .delete(`/api/connectors/configurations/rabbit/${encodeURIComponent(rabbitConnectorName)}`)
      .catch(() => undefined)
    rabbitConnectorName = null
  }
  if (kafkaConnectorName) {
    await request
      .delete(`/api/connectors/configurations/kafka/${encodeURIComponent(kafkaConnectorName)}`)
      .catch(() => undefined)
    kafkaConnectorName = null
  }
})

test('request config: selecting a Kafka connector exposes the topic field and Kafka envelope', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)

  await selectKafkaConnector(page)

  // Kafka path: topic + Kafka envelope (key + headers). The queue / routing
  // key / exchange triplet must NOT render.
  await expect(page.getByLabel('Topic')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Kafka key' })).toBeVisible()
  await expect(page.getByLabel('Queue')).toHaveCount(0)
  await expect(page.getByLabel('Routing key')).toHaveCount(0)
  await expect(page.getByLabel('Exchange')).toHaveCount(0)
})

test('request config: selecting a Rabbit connector exposes queue, routing key and exchange', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await selectRabbitConnector(page)

  // Rabbit path: the Kafka envelope is gone (isKafkaConnector === false) and
  // the queue/routing/exchange triplet appears.
  await expect(page.getByLabel('Queue')).toBeVisible()
  await expect(page.getByLabel('Routing key')).toBeVisible()
  await expect(page.getByLabel('Exchange')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Kafka key' })).toHaveCount(0)
})

test('request config: switching content type JSON → PROTOBUF reveals the Proto schema section', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await selectKafkaConnector(page)

  // JSON mode (default) — no Proto schema editor anywhere on the page.
  await expect(page.getByText('Proto schema (.proto)')).toHaveCount(0)

  await page.getByLabel('Content type').selectOption('protobuf')

  await expect(page.getByText('Proto schema (.proto)')).toBeVisible()

  // Switching back hides it again — proves the section is conditional on
  // contentMode rather than just lazily mounted.
  await page.getByLabel('Content type').selectOption('json')
  await expect(page.getByText('Proto schema (.proto)')).toHaveCount(0)
})

test('request config: typing in the topic field updates the input value', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await selectKafkaConnector(page)

  const topic = page.getByLabel('Topic')
  await topic.fill('orders.created.v1')
  await expect(topic).toHaveValue('orders.created.v1')
})

test('request config: routing key and exchange persist their typed values under Rabbit', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await selectRabbitConnector(page)

  await page.getByLabel('Routing key').fill('orders.created')
  await page.getByLabel('Exchange').fill('orders.topic')

  await expect(page.getByLabel('Routing key')).toHaveValue('orders.created')
  await expect(page.getByLabel('Exchange')).toHaveValue('orders.topic')
})

test('request config: literal Kafka key persists the typed value as-is', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await selectKafkaConnector(page)

  // New rows start in `literal` kind — KeyModeInput renders an <input>
  // with the user-friendly "user-123" placeholder.
  const keyInput = page.locator('#dispatch-kafka-key-input')
  await keyInput.fill('user-7421')
  await expect(keyInput).toHaveValue('user-7421')
})

test('request config: switching Kafka key mode to $ref clears the field and re-prompts with the path placeholder', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await selectKafkaConnector(page)

  const keyInput = page.locator('#dispatch-kafka-key-input')
  await keyInput.fill('user-7421')

  // KeyModeInput's switchKind dispatches { kind, value: '' } on kind change —
  // the kafka envelope reducer keeps kafkaKeyRaw across kind toggles, but the
  // rendered <input> binds to value.value which is '' until the user types.
  const modeRadio = page.getByRole('radiogroup', { name: 'Kafka key' })
  await modeRadio.getByRole('radio', { name: '$ref' }).click()

  await expect(modeRadio.getByRole('radio', { name: '$ref' })).toHaveAttribute('aria-checked', 'true')
  await expect(modeRadio.getByRole('radio', { name: 'literal' })).toHaveAttribute('aria-checked', 'false')
  // Placeholder shifts to the path hint when not in literal mode.
  await expect(keyInput).toHaveAttribute('placeholder', 'currentEvent.userId')
})

test('request config: $fn mode swaps the Kafka key input for the function-hint editor', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await selectKafkaConnector(page)

  const modeRadio = page.getByRole('radiogroup', { name: 'Kafka key' })
  await modeRadio.getByRole('radio', { name: '$fn' }).click()

  await expect(modeRadio.getByRole('radio', { name: '$fn' })).toHaveAttribute('aria-checked', 'true')
  // FnHintInput uses "uuid()" as its placeholder.
  await expect(page.locator('#dispatch-kafka-key-input')).toHaveAttribute('placeholder', 'uuid()')
})

test('request config: adding a Kafka header row creates a second editable pair', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await selectKafkaConnector(page)

  // Default state: one header row (the "+" only renders on index 0). After
  // clicking "+" a second row appears — total 2 key inputs and 2 value
  // inputs, the second row has only a "Remove header" (no add) button.
  await expect(page.getByLabel('Header key')).toHaveCount(1)
  await page.getByRole('button', { name: 'Add header' }).click()
  await expect(page.getByLabel('Header key')).toHaveCount(2)
  await expect(page.getByLabel('Header value')).toHaveCount(2)
})

test('request config: editing a Kafka header key and value persists in both inputs', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await selectKafkaConnector(page)

  await page.getByLabel('Header key').first().fill('x-correlation-id')
  await page.getByLabel('Header value').first().fill('e2e-trace-1')

  await expect(page.getByLabel('Header key').first()).toHaveValue('x-correlation-id')
  await expect(page.getByLabel('Header value').first()).toHaveValue('e2e-trace-1')
})

test('request config: removing a Kafka header row drops the pair from the list', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await selectKafkaConnector(page)

  await page.getByLabel('Header key').first().fill('to-be-removed')
  await page.getByRole('button', { name: 'Add header' }).click()
  await expect(page.getByLabel('Header key')).toHaveCount(2)

  // Remove the first row — header count goes back to 1, and what remains is
  // the row added via "+" (its key field is still empty).
  await page.getByRole('button', { name: 'Remove header' }).first().click()
  await expect(page.getByLabel('Header key')).toHaveCount(1)
  await expect(page.getByLabel('Header key').first()).toHaveValue('')
})

test('request config: switching between Kafka and Rabbit toggles the envelope and routing fields', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForRequestReady(page)
  await selectKafkaConnector(page)
  await expect(page.getByRole('textbox', { name: 'Kafka key' })).toBeVisible()

  await selectRabbitConnector(page)
  await expect(page.getByRole('textbox', { name: 'Kafka key' })).toHaveCount(0)
  await expect(page.getByLabel('Routing key')).toBeVisible()

  // Back to Kafka — envelope re-renders. Important regression catch: when the
  // user flips broker types repeatedly the kafka envelope state must stay
  // available without a full reload.
  await selectKafkaConnector(page)
  await expect(page.getByRole('textbox', { name: 'Kafka key' })).toBeVisible()
  await expect(page.getByLabel('Routing key')).toHaveCount(0)
})

async function ensureKafkaConnector(request: APIRequestContext): Promise<string> {
  const listed = await request.get('/api/connectors/configurations').catch(() => null)
  if (listed?.ok()) {
    const payload = (await listed.json()) as Array<{ type?: string; name?: string }>
    const existing = payload.find((entry) => entry.type === 'kafka' && typeof entry.name === 'string')
    if (existing?.name) return existing.name
  }

  const name = `e2e-md-kafka-${Date.now()}`
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

async function ensureRabbitConnector(request: APIRequestContext): Promise<string> {
  const listed = await request.get('/api/connectors/configurations').catch(() => null)
  if (listed?.ok()) {
    const payload = (await listed.json()) as Array<{ type?: string; name?: string }>
    const existing = payload.find((entry) => entry.type === 'rabbit' && typeof entry.name === 'string')
    if (existing?.name) return existing.name
  }

  const name = `e2e-md-rabbit-${Date.now()}`
  const created = await request.post('/api/connectors/configurations', {
    data: {
      type: 'rabbit',
      name,
      host: RABBIT_HOST,
      port: RABBIT_PORT,
      virtualHost: '/',
      username: 'guest',
      password: 'guest',
    },
  })
  if (!created.ok()) {
    throw new Error(`could not seed rabbit connector: ${created.status()} ${await created.text()}`)
  }
  return name
}

async function waitForRequestReady(page: Page) {
  // The connector dropdown is disabled while isLoadingConfig is true; waiting
  // for it to be enabled is the tightest signal that the initial connectors
  // GET resolved (and the BE seeded connectors are visible to the page).
  await expect(page.getByLabel('Connector')).toBeEnabled()
}

async function selectKafkaConnector(page: Page) {
  if (!kafkaConnectorName) throw new Error('kafka connector not seeded')
  // The select uses `${name} (KAFKA)` as its display label per
  // DispatchConnectorConfig — selectOption matches on `value` attribute,
  // which is just the name.
  await page.getByLabel('Connector').selectOption(kafkaConnectorName)
  await expect(page.getByLabel('Connector')).toHaveValue(kafkaConnectorName)
}

async function selectRabbitConnector(page: Page) {
  if (!rabbitConnectorName) throw new Error('rabbit connector not seeded')
  await page.getByLabel('Connector').selectOption(rabbitConnectorName)
  await expect(page.getByLabel('Connector')).toHaveValue(rabbitConnectorName)
}
