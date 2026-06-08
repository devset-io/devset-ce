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

// SQLite serializes writes file-wide; mirror the schema-repo/message-dispatch
// pattern so parallel workers do not trip [SQLITE_BUSY] on connector writes.
test.describe.configure({ mode: 'serial' })

const NAME_PREFIX = 'e2e_settings_kafka'
const RABBIT_NAME_PREFIX = 'e2e_settings_rabbit'
const KAFKA_BOOTSTRAP = process.env.E2E_KAFKA_BOOTSTRAP ?? 'kafka:29092'
const KAFKA_BOOTSTRAP_ALT = process.env.E2E_KAFKA_BOOTSTRAP_ALT ?? 'kafka:39092'
const RABBIT_HOST = process.env.E2E_RABBIT_HOST ?? 'rabbitmq'

// Tracked per worker. Any (type, name) pushed here gets a best-effort DELETE in
// afterEach so failed tests do not leak connectors onto the shared backend.
const createdConnectors: Array<{ type: 'kafka' | 'rabbit'; name: string }> = []

test.afterEach(async ({ request }) => {
  const pending = createdConnectors.splice(0)
  // Sequential delete: SQLite serializes writes — parallel DELETEs would trip
  // [SQLITE_BUSY]. The catch swallows 404s (already removed via the UI).
  for (const { type, name } of pending) {
    await request
      .delete(`/api/connectors/configurations/${type}/${encodeURIComponent(name)}`)
      .catch(() => undefined)
  }
})

test('settings/brokers: switching to the Databases tab swaps the form heading', async ({ page }) => {
  await page.goto('/settings')
  await expect(brokersTab(page)).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: 'Connector configuration' })).toBeVisible()

  await databasesTab(page).click()
  await expect(databasesTab(page)).toHaveAttribute('aria-selected', 'true')
  // Brokers form heading is unmounted — proves the tabpanel swaps content, not
  // just visibility.
  await expect(page.getByRole('heading', { name: 'Connector configuration' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Database configuration' })).toBeVisible()
})

test('settings/brokers: creating a Kafka connector adds it to the active list', async ({ page }) => {
  const name = trackKafkaName('create')

  await gotoBrokers(page)
  await createKafkaConnector(page, { name, bootstrapServers: KAFKA_BOOTSTRAP })

  // Newly-created connector wins the active slot per loadConnectorsState +
  // setActiveConnector in createConnectorConfiguration — the ACTIVE pill is
  // the witness.
  const row = connectorRow(page, name)
  await expect(row).toBeVisible()
  await expect(row).toContainText('ACTIVE')
  await expect(row).toContainText('KAFKA')
  await expect(row).toContainText(KAFKA_BOOTSTRAP)
})

test('settings/brokers: creating a RabbitMQ connector adds a RABBIT row', async ({ page }) => {
  const name = trackRabbitName('create')

  await gotoBrokers(page)
  await page.getByLabel('Connector type').selectOption('rabbit')
  // Swapping types resets the default name to `local-rabbit`; overwrite it
  // with our tracked unique name.
  await fillByLabel(page, 'Connector name', name)
  await fillByLabel(page, 'Host', RABBIT_HOST)
  await fillByLabel(page, 'Virtual host', '/')
  await page.getByRole('button', { name: 'Open connection', exact: true }).click()

  const row = connectorRow(page, name)
  await expect(row).toBeVisible()
  await expect(row).toContainText('RABBIT')
})

test('settings/brokers: Open connection button stays disabled while the connector name is empty', async ({ page }) => {
  await gotoBrokers(page)

  const submit = page.getByRole('button', { name: 'Open connection', exact: true })
  // Default draft seeds `local-kafka` and a valid bootstrap, so the button
  // starts enabled — clearing the name should disable it.
  await expect(submit).toBeEnabled()

  await fillByLabel(page, 'Connector name', '   ')
  await expect(submit).toBeDisabled()

  await fillByLabel(page, 'Connector name', 'x')
  await expect(submit).toBeEnabled()
})

test('settings/brokers: confirming overwrite saves the new bootstrap servers on the existing row', async ({ page }) => {
  const name = trackKafkaName('overwrite_yes')

  await gotoBrokers(page)
  await createKafkaConnector(page, { name, bootstrapServers: KAFKA_BOOTSTRAP })
  await expect(connectorRow(page, name)).toContainText(KAFKA_BOOTSTRAP)

  // Start a fresh draft for a connector with the same name but a different
  // bootstrap — the connect effect should detect the name clash and route
  // through the overwrite modal instead of submitting silently.
  await page.getByRole('button', { name: 'New connector', exact: true }).click()
  await fillByLabel(page, 'Connector name', name)
  await fillByLabel(page, 'Bootstrap servers', KAFKA_BOOTSTRAP_ALT)
  await page.getByRole('button', { name: 'Open connection', exact: true }).click()

  const overwriteDialog = page.getByRole('dialog', { name: 'Overwrite connector' })
  await expect(overwriteDialog).toBeVisible()
  await overwriteDialog.getByRole('button', { name: 'Overwrite connector', exact: true }).click()

  await expect(overwriteDialog).toHaveCount(0)
  // Still exactly one row with this name — no phantom duplicate from a
  // double-submit — and the endpoint reflects the new bootstrap.
  await expect(connectorRowsByName(page, name)).toHaveCount(1)
  await expect(connectorRow(page, name)).toContainText(KAFKA_BOOTSTRAP_ALT)
})

test('settings/brokers: cancelling the overwrite modal leaves the existing connector untouched', async ({ page }) => {
  const name = trackKafkaName('overwrite_cancel')

  await gotoBrokers(page)
  await createKafkaConnector(page, { name, bootstrapServers: KAFKA_BOOTSTRAP })

  await page.getByRole('button', { name: 'New connector', exact: true }).click()
  await fillByLabel(page, 'Connector name', name)
  await fillByLabel(page, 'Bootstrap servers', KAFKA_BOOTSTRAP_ALT)
  await page.getByRole('button', { name: 'Open connection', exact: true }).click()

  const overwriteDialog = page.getByRole('dialog', { name: 'Overwrite connector' })
  await expect(overwriteDialog).toBeVisible()
  // ModalShell's header Cancel uses the shared `flow.common.cancel` label.
  await overwriteDialog.getByRole('button', { name: 'Cancel', exact: true }).click()

  await expect(overwriteDialog).toHaveCount(0)
  // No POST fired — the original bootstrap is still on the row.
  await expect(connectorRow(page, name)).toContainText(KAFKA_BOOTSTRAP)
  await expect(connectorRow(page, name)).not.toContainText(KAFKA_BOOTSTRAP_ALT)
})

test('settings/brokers: clicking a connector row loads its config into the edit form', async ({ page }) => {
  const name = trackKafkaName('edit_load')

  await gotoBrokers(page)
  await createKafkaConnector(page, { name, bootstrapServers: KAFKA_BOOTSTRAP })

  // After create the editor stays parked on the just-saved connector
  // (submitSuccess sets editingConnectorName). Hop back to a fresh draft so
  // the assertion proves clicking the row, not the create flow, hydrated the
  // form.
  await page.getByRole('button', { name: 'New connector', exact: true }).click()
  await expect(page.getByLabel('Connector name')).toHaveValue('local-kafka')

  await connectorRow(page, name).click()

  // editingLoaded copies the row's payload into the draft, the form switches
  // to "Save changes", and the editing summary names the connector.
  await expect(page.getByLabel('Connector name')).toHaveValue(name)
  await expect(page.getByLabel('Bootstrap servers')).toHaveValue(KAFKA_BOOTSTRAP)
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible()
  await expect(page.getByText(`Editing connector "${name}".`)).toBeVisible()
  await expect(connectorRow(page, name)).toContainText('EDITING')
})

test('settings/brokers: clicking New connector while editing resets the form back to defaults', async ({ page }) => {
  const name = trackKafkaName('new_resets')

  await gotoBrokers(page)
  await createKafkaConnector(page, { name, bootstrapServers: KAFKA_BOOTSTRAP })
  // submitSuccess leaves the form in edit mode on the freshly-saved connector.
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'New connector', exact: true }).click()

  await expect(page.getByLabel('Connector name')).toHaveValue('local-kafka')
  await expect(page.getByLabel('Bootstrap servers')).toHaveValue('localhost:29092')
  await expect(page.getByRole('button', { name: 'Open connection', exact: true })).toBeVisible()
  await expect(page.getByText(`Editing connector "${name}".`)).toHaveCount(0)
})

test('settings/brokers: deleting from the inline row button removes the connector from the list', async ({ page }) => {
  const name = trackKafkaName('inline_delete')

  await gotoBrokers(page)
  await createKafkaConnector(page, { name, bootstrapServers: KAFKA_BOOTSTRAP })

  // The inline button text matches the form-level delete; scope to the row
  // so we cannot accidentally click the wrong control.
  await connectorRow(page, name)
    .getByRole('button', { name: 'Delete connector', exact: true })
    .click()

  const deleteDialog = page.getByRole('dialog', { name: 'Delete connector' })
  await expect(deleteDialog).toBeVisible()
  await deleteDialog.getByRole('button', { name: 'Delete connector', exact: true }).click()

  await expect(deleteDialog).toHaveCount(0)
  await expect(connectorRowsByName(page, name)).toHaveCount(0)
})

test('settings/brokers: confirming delete from the edit form resets the form and removes the row', async ({ page }) => {
  const name = trackKafkaName('edit_delete')

  await gotoBrokers(page)
  await createKafkaConnector(page, { name, bootstrapServers: KAFKA_BOOTSTRAP })
  // After create the form is in edit mode — the form-level delete button
  // dispatches requestDeleteEditing, a separate reducer path from the inline
  // requestDelete tested above.
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible()

  await page
    .locator('.settings-form-actions')
    .getByRole('button', { name: 'Delete connector', exact: true })
    .click()
  const deleteDialog = page.getByRole('dialog', { name: 'Delete connector' })
  await deleteDialog.getByRole('button', { name: 'Delete connector', exact: true }).click()

  await expect(connectorRowsByName(page, name)).toHaveCount(0)
  // deleteSuccess.wasEditing true → form resets to a blank draft.
  await expect(page.getByLabel('Connector name')).toHaveValue('local-kafka')
  await expect(page.getByRole('button', { name: 'Open connection', exact: true })).toBeVisible()
})

test('settings/brokers: cancelling the delete modal keeps the connector in the list', async ({ page }) => {
  const name = trackKafkaName('delete_cancel')

  await gotoBrokers(page)
  await createKafkaConnector(page, { name, bootstrapServers: KAFKA_BOOTSTRAP })

  await connectorRow(page, name)
    .getByRole('button', { name: 'Delete connector', exact: true })
    .click()
  const deleteDialog = page.getByRole('dialog', { name: 'Delete connector' })
  await deleteDialog.getByRole('button', { name: 'Cancel', exact: true }).click()

  await expect(deleteDialog).toHaveCount(0)
  await expect(connectorRow(page, name)).toBeVisible()
})

test('settings/brokers: clicking a connector radio promotes it to ACTIVE', async ({ page }) => {
  const first = trackKafkaName('act_first')
  const second = trackKafkaName('act_second')

  await gotoBrokers(page)
  await createKafkaConnector(page, { name: first, bootstrapServers: KAFKA_BOOTSTRAP })
  await page.getByRole('button', { name: 'New connector', exact: true }).click()
  await createKafkaConnector(page, { name: second, bootstrapServers: KAFKA_BOOTSTRAP })

  // Both rows must be rendered before we drive the activate flow.
  await expect(connectorRow(page, first)).toBeVisible()
  await expect(connectorRow(page, second)).toBeVisible()

  // We use raw .click() + polling assertions rather than .check() because the
  // FE state propagates through dispatch → effect → setActiveConnector → emit
  // → subscriber → dispatch — more turns of the event loop than .check()'s
  // one-shot post-click verification tolerates, and setActiveConnector early-
  // returns when runtimeActiveConnectorName already matches, so clicking the
  // radio of the already-active connector is a silent no-op the helper can't
  // distinguish from a state change.
  //
  // Activating `first` is the first half: either flips state to first or it
  // was already there — the post-condition holds either way.
  await page.getByRole('radio', { name: first }).click()
  await expect(connectorRow(page, first)).toContainText('ACTIVE')
  await expect(connectorRow(page, second)).not.toContainText('ACTIVE')

  // The crucial half: clicking `second` while `first` is active forces a
  // real state change. If activateConnector didn't fire, this fails.
  await page.getByRole('radio', { name: second }).click()
  await expect(connectorRow(page, second)).toContainText('ACTIVE')
  await expect(connectorRow(page, first)).not.toContainText('ACTIVE')
  // Status footer mirrors activeConnectorName — proves the change landed in
  // SettingsViewData.activeConnector, not just the radio's DOM state.
  await expect(page.getByText(`connected (${second})`)).toBeVisible()
})

test('settings/brokers: Refresh connections triggers a GET and re-renders the list', async ({ page }) => {
  const name = trackKafkaName('refresh')

  await gotoBrokers(page)
  await createKafkaConnector(page, { name, bootstrapServers: KAFKA_BOOTSTRAP })

  const refetch = page.waitForResponse(
    (res) =>
      res.url().includes('/api/connectors/configurations') &&
      res.request().method() === 'GET' &&
      res.ok(),
  )
  await page.getByRole('button', { name: 'Refresh connections', exact: true }).click()
  await refetch

  // Re-rendered list still contains our row — sanity-checks the refresh did
  // not blank out state on success.
  await expect(connectorRow(page, name)).toBeVisible()
})

test('settings/brokers: pressing arrow keys on the tablist swaps between tabs', async ({ page }) => {
  await page.goto('/settings')
  // The handler toggles on both ArrowRight and ArrowLeft — keying right from
  // Brokers must land on Databases, and keying left from Databases must
  // bounce back. Round-tripping covers both paths through handleTabKeyDown.
  await brokersTab(page).focus()
  await page.keyboard.press('ArrowRight')
  await expect(databasesTab(page)).toHaveAttribute('aria-selected', 'true')
  await expect(brokersTab(page)).toHaveAttribute('aria-selected', 'false')

  await databasesTab(page).focus()
  await page.keyboard.press('ArrowLeft')
  await expect(brokersTab(page)).toHaveAttribute('aria-selected', 'true')
})

test('settings/brokers: clearing Bootstrap servers disables Open connection (Kafka)', async ({ page }) => {
  await gotoBrokers(page)

  const submit = page.getByRole('button', { name: 'Open connection', exact: true })
  await expect(submit).toBeEnabled()
  // Same trim guard the reducer's selectors apply — whitespace counts as
  // empty so canSubmit drops.
  await fillByLabel(page, 'Bootstrap servers', '   ')
  await expect(submit).toBeDisabled()
})

test('settings/brokers: rabbit form gates Open connection on host, port>=1, and virtual host', async ({ page }) => {
  await gotoBrokers(page)
  await page.getByLabel('Connector type').selectOption('rabbit')

  const submit = page.getByRole('button', { name: 'Open connection', exact: true })
  // Defaults: name=local-rabbit, host=localhost, port=5672, virtualHost=/ —
  // canSubmit is true before we start blanking fields.
  await expect(submit).toBeEnabled()

  await fillByLabel(page, 'Host', '')
  await expect(submit).toBeDisabled()
  await fillByLabel(page, 'Host', 'localhost')
  await expect(submit).toBeEnabled()

  // Port must be >= 1 — 0 trips Number.isFinite && parsedPort >= 1.
  await fillByLabel(page, 'Port', '0')
  await expect(submit).toBeDisabled()
  await fillByLabel(page, 'Port', '5672')
  await expect(submit).toBeEnabled()

  await fillByLabel(page, 'Virtual host', '')
  await expect(submit).toBeDisabled()
})

test('settings/brokers: switching connector type swaps the default name', async ({ page }) => {
  await gotoBrokers(page)
  await expect(page.getByLabel('Connector name')).toHaveValue('local-kafka')

  await page.getByLabel('Connector type').selectOption('rabbit')
  // The reducer's connectorTypeChanged swaps the name only when the current
  // value matches the *previous* type's default — that round-trips cleanly.
  await expect(page.getByLabel('Connector name')).toHaveValue('local-rabbit')

  await page.getByLabel('Connector type').selectOption('kafka')
  await expect(page.getByLabel('Connector name')).toHaveValue('local-kafka')
})

test('settings/brokers: switching connector type preserves a user-typed connector name', async ({ page }) => {
  await gotoBrokers(page)
  // Once the user overrides the default name, connectorTypeChanged's
  // `shouldSwapDefaultName` is false and the name sticks across type flips.
  await fillByLabel(page, 'Connector name', 'custom-name')

  await page.getByLabel('Connector type').selectOption('rabbit')
  await expect(page.getByLabel('Connector name')).toHaveValue('custom-name')
  await page.getByLabel('Connector type').selectOption('kafka')
  await expect(page.getByLabel('Connector name')).toHaveValue('custom-name')
})

test('settings/brokers: editing an authenticated Kafka connector shows the review warning and gates save on credentials', async ({ page, request }) => {
  const name = trackKafkaName('auth')
  // Seed via API with username+password so the BE reports authenticated=true.
  // The FE's getEditableConnectorConfiguration then sets
  // {requiresAttention, requiresCredentials}=true, which is the warning path
  // we cannot exercise from the UI alone (no field for credentials at create).
  const seed = await request.post('/api/connectors/configurations', {
    data: {
      type: 'kafka',
      name,
      bootstrapServers: KAFKA_BOOTSTRAP,
      username: 'u',
      password: 'p',
    },
  })
  if (!seed.ok()) throw new Error(`seed failed: ${seed.status()} ${await seed.text()}`)

  await gotoBrokers(page)
  await connectorRow(page, name).click()

  // handleEditConnector fires toast.warning AND the reducer flips
  // draftRequiresAttention → the form renders the same copy inline as
  // <p class="settings-warning">. Scope to the inline paragraph; matching
  // the bare text would strict-mode-fail because the sonner toast carries
  // the same string.
  await expect(page.locator('.settings-warning')).toHaveText(
    'This form was reconstructed from safe connector status. Review the fields and re-enter credentials before saving if the connector requires them.',
  )

  const save = page.getByRole('button', { name: 'Save changes', exact: true })
  // computeCanSubmit: requiresCredentials && connectorNameExists && empty
  // creds → false. The name still matches the seeded connector, so the gate
  // is purely on user/password being non-blank.
  await expect(save).toBeDisabled()

  await fillByLabel(page, 'Username (optional)', 'u2')
  await expect(save).toBeDisabled()
  await fillByLabel(page, 'Password (optional)', 'p2')
  await expect(save).toBeEnabled()
})

test('settings/brokers: a 5xx on connector create surfaces the backend error as a toast and leaves the form intact', async ({ page }) => {
  await page.route('**/api/connectors/configurations', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Backend exploded' }),
      })
      return
    }
    await route.continue()
  })

  await gotoBrokers(page)
  await fillByLabel(page, 'Connector name', 'broken')
  await page.getByRole('button', { name: 'Open connection', exact: true }).click()

  // readApiErrorMessage extracts `message` from the JSON body; the effect
  // surfaces it verbatim via toast.error → the user sees the backend's text,
  // not a generic fallback.
  await expect(page.getByText('Backend exploded')).toBeVisible()
  // submitFailed flips isSubmitting off and changes nothing else — no
  // editingConnectorName means the button is still "Open connection".
  await expect(page.getByRole('button', { name: 'Open connection', exact: true })).toBeVisible()
})

test('settings/brokers: a 5xx on connector list surfaces a connectionsError under the list heading', async ({ page }) => {
  await page.route('**/api/connectors/configurations', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'List exploded' }),
      })
      return
    }
    await route.continue()
  })

  await page.goto('/settings')
  // refreshFailed routes the backend message into connectionsError, which
  // SettingsConnectorList renders as <p className="settings-error">.
  await expect(page.locator('.settings-error')).toHaveText('List exploded')
})

test('settings/brokers: empty connector list shows the no-connections placeholder', async ({ page }) => {
  await page.route('**/api/connectors/configurations', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
      return
    }
    await route.continue()
  })

  await page.goto('/settings')
  await expect(page.getByText('No active backend connections.')).toBeVisible()
  // The status footer mirrors activeConnector=null when the list is empty.
  await expect(page.getByText('disconnected (no active connector)')).toBeVisible()
})

test('settings/brokers: clicking Save changes on an unchanged edit still opens the overwrite confirmation', async ({ page }) => {
  const name = trackKafkaName('edit_save_modal')

  await gotoBrokers(page)
  await createKafkaConnector(page, { name, bootstrapServers: KAFKA_BOOTSTRAP })
  // After create the form is already in edit mode — clicking Save changes
  // here is the "edit + save" path. The brokers effect always opens the
  // overwrite modal when the name exists (no editingConnectorName escape
  // hatch — that's the databases tab's behavior).
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()

  await expect(page.getByRole('dialog', { name: 'Overwrite connector' })).toBeVisible()
  // Cancel out so afterEach's API delete can run without contention.
  await page
    .getByRole('dialog', { name: 'Overwrite connector' })
    .getByRole('button', { name: 'Cancel', exact: true })
    .click()
})

function trackKafkaName(kind: string): string {
  const name = `${NAME_PREFIX}_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  createdConnectors.push({ type: 'kafka', name })
  return name
}

function trackRabbitName(kind: string): string {
  const name = `${RABBIT_NAME_PREFIX}_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  createdConnectors.push({ type: 'rabbit', name })
  return name
}

async function gotoBrokers(page: Page): Promise<void> {
  await page.goto('/settings')
  await expect(brokersTab(page)).toHaveAttribute('aria-selected', 'true')
  // The form mounts synchronously, but waiting for its heading ensures the
  // brokers tabpanel has rendered before any locator queries.
  await expect(page.getByRole('heading', { name: 'Connector configuration' })).toBeVisible()
}

async function createKafkaConnector(
  page: Page,
  options: { name: string; bootstrapServers: string },
): Promise<void> {
  await fillByLabel(page, 'Connector name', options.name)
  await fillByLabel(page, 'Bootstrap servers', options.bootstrapServers)
  await page.getByRole('button', { name: 'Open connection', exact: true }).click()
  // submitSuccess flips the form into edit mode on the just-saved connector —
  // the Save changes button is a deterministic "POST landed and reducer ran"
  // signal, far more reliable than waiting for the toast.
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible()
  // And the connector must appear in the right-hand list before the test
  // continues, otherwise downstream row-scoped locators race the refresh.
  await expect(connectorRow(page, options.name)).toBeVisible()
}

function brokersTab(page: Page): Locator {
  return page.getByRole('tab', { name: 'Brokers', exact: true })
}

function databasesTab(page: Page): Locator {
  return page.getByRole('tab', { name: 'Databases', exact: true })
}

function connectorRow(page: Page, name: string): Locator {
  // .settings-connector-item is the row container with aria-label={name};
  // filtering by exact text on the <strong>{name}</strong> child is the
  // tightest accessible-name-free disambiguator we have.
  return page.locator('.settings-connector-item').filter({
    has: page.locator('strong', { hasText: new RegExp(`^${escapeRegex(name)}$`) }),
  })
}

function connectorRowsByName(page: Page, name: string): Locator {
  return connectorRow(page, name)
}

async function fillByLabel(page: Page, label: string, value: string): Promise<void> {
  const input = page.getByLabel(label, { exact: true })
  await input.fill(value)
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
