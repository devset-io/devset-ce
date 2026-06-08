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

// SQLite serializes writes file-wide; mirror schema-repo so parallel workers
// do not trip [SQLITE_BUSY] on db connector writes.
test.describe.configure({ mode: 'serial' })

const NAME_PREFIX = 'e2e_settings_db'
// The MongoDB Java driver is lazy — MongoClients.create() returns a client
// without actually opening a socket. So any well-formed URI registers fine
// even when no real MongoDB is reachable in the e2e environment.
const MONGO_URI = 'mongodb://localhost:27017'
const MONGO_URI_ALT = 'mongodb://localhost:27018'
const DB_NAME = 'e2e_db'
const DB_NAME_ALT = 'e2e_db_alt'

const createdConnectors: Array<{ type: 'mongodb' | 'postgres'; name: string }> = []

test.afterEach(async ({ request }) => {
  const pending = createdConnectors.splice(0)
  for (const { type, name } of pending) {
    await request
      .delete(`/api/db/connectors/configurations/${type}/${encodeURIComponent(name)}`)
      .catch(() => undefined)
  }
})

test('settings/databases: creating a MongoDB connector adds it to the database list', async ({ page }) => {
  const name = trackMongoName('create')

  await gotoDatabases(page)
  await createMongoConnector(page, { name, connectionString: MONGO_URI, database: DB_NAME })

  const row = connectorRow(page, name)
  await expect(row).toBeVisible()
  await expect(row).toContainText('MongoDB')
  // The list masks credentials in the connection string before rendering;
  // an unauthenticated URI passes through untouched.
  await expect(row).toContainText(MONGO_URI)
})

test('settings/databases: Open connection button stays disabled until name, connection string, and database are filled', async ({ page }) => {
  await gotoDatabases(page)

  const submit = page.getByRole('button', { name: 'Open connection', exact: true })
  // Default draft: name=`local-mongo`, connectionString=mongodb://localhost:27017,
  // database='' — so the database field is the lone gate at first load.
  await expect(submit).toBeDisabled()

  await fillByLabel(page, 'Database name', DB_NAME)
  await expect(submit).toBeEnabled()

  // Clearing the connector name disables again — proves canSubmit checks
  // every required field, not just the database one.
  await fillByLabel(page, 'Connection name', '   ')
  await expect(submit).toBeDisabled()
})

test('settings/databases: switching db type to PostgreSQL shows the coming-soon banner and hides the form', async ({ page }) => {
  await gotoDatabases(page)
  // Sanity: form fields exist while we are on MongoDB.
  await expect(page.getByLabel('Connection name')).toBeVisible()

  await page.getByLabel('Database type').selectOption('postgres')

  await expect(page.getByText('PostgreSQL support is coming soon.')).toBeVisible()
  // The whole form branch is unmounted on Postgres — no inputs, no submit
  // button — so there is no way to create a Postgres connector via the UI.
  await expect(page.getByLabel('Connection name')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Open connection', exact: true })).toHaveCount(0)
})

test('settings/databases: clicking a connector row loads its config into the edit form', async ({ page }) => {
  const name = trackMongoName('edit_load')

  await gotoDatabases(page)
  await createMongoConnector(page, { name, connectionString: MONGO_URI, database: DB_NAME })

  // Reset to a fresh draft so the assertion proves the row click, not the
  // create flow, hydrated the form.
  await page.getByRole('button', { name: 'New connection', exact: true }).click()
  await expect(page.getByLabel('Connection name')).toHaveValue('local-mongo')

  await connectorRow(page, name).click()

  await expect(page.getByLabel('Connection name')).toHaveValue(name)
  await expect(page.getByLabel('Connection string')).toHaveValue(MONGO_URI)
  // BE's MongoDbConnectionStatusDto omits the `database` field, so the GET
  // /db/connectors/configurations response doesn't carry it through.
  // sanitizeDbConnectorStatus defaults it to '' and toDbConnectorDraft
  // passes that empty string into the form. The user has to re-enter the
  // database name on edit — this is the actual current behavior.
  await expect(page.getByLabel('Database name')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible()
  await expect(page.getByText(`Editing connection "${name}".`)).toBeVisible()
  await expect(connectorRow(page, name)).toContainText('EDITING')
})

test('settings/databases: saving while editing the same connector overwrites it without confirmation', async ({ page }) => {
  const name = trackMongoName('edit_save_no_modal')

  await gotoDatabases(page)
  await createMongoConnector(page, { name, connectionString: MONGO_URI, database: DB_NAME })

  // Stay in edit mode on the same connector and change the database name —
  // the connect effect skips the overwrite modal because
  // `editingConnectorName === normalizedDraftName`.
  await fillByLabel(page, 'Database name', DB_NAME_ALT)
  const postResponse = page.waitForResponse(
    (res) =>
      res.url().includes('/api/db/connectors/configurations') &&
      res.request().method() === 'POST' &&
      res.ok(),
  )
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await postResponse

  // No modal ever appeared, and a refresh follows submitSuccess —
  // the row should now be present (BE lists the latest config).
  await expect(page.getByRole('dialog', { name: 'Overwrite connection' })).toHaveCount(0)
  await expect(connectorRow(page, name)).toBeVisible()
})

test('settings/databases: confirming overwrite when typing a duplicate name updates the existing row', async ({ page }) => {
  const name = trackMongoName('overwrite_yes')

  await gotoDatabases(page)
  await createMongoConnector(page, { name, connectionString: MONGO_URI, database: DB_NAME })

  // Fresh draft → duplicate name → connect effect detects the clash and
  // routes through the overwrite modal (different reducer branch from the
  // same-row edit tested above).
  await page.getByRole('button', { name: 'New connection', exact: true }).click()
  await fillByLabel(page, 'Connection name', name)
  await fillByLabel(page, 'Connection string', MONGO_URI_ALT)
  await fillByLabel(page, 'Database name', DB_NAME)
  await page.getByRole('button', { name: 'Open connection', exact: true }).click()

  const overwriteDialog = page.getByRole('dialog', { name: 'Overwrite connection' })
  await expect(overwriteDialog).toBeVisible()
  await overwriteDialog.getByRole('button', { name: 'Overwrite connection', exact: true }).click()

  await expect(overwriteDialog).toHaveCount(0)
  await expect(connectorRowsByName(page, name)).toHaveCount(1)
  await expect(connectorRow(page, name)).toContainText(MONGO_URI_ALT)
})

test('settings/databases: cancelling the overwrite modal leaves the existing connector untouched', async ({ page }) => {
  const name = trackMongoName('overwrite_cancel')

  await gotoDatabases(page)
  await createMongoConnector(page, { name, connectionString: MONGO_URI, database: DB_NAME })

  await page.getByRole('button', { name: 'New connection', exact: true }).click()
  await fillByLabel(page, 'Connection name', name)
  await fillByLabel(page, 'Connection string', MONGO_URI_ALT)
  await fillByLabel(page, 'Database name', DB_NAME)
  await page.getByRole('button', { name: 'Open connection', exact: true }).click()

  const overwriteDialog = page.getByRole('dialog', { name: 'Overwrite connection' })
  await overwriteDialog.getByRole('button', { name: 'Cancel', exact: true }).click()

  await expect(overwriteDialog).toHaveCount(0)
  // No POST fired — the row still shows the original URI.
  await expect(connectorRow(page, name)).toContainText(MONGO_URI)
  await expect(connectorRow(page, name)).not.toContainText(MONGO_URI_ALT)
})

test('settings/databases: deleting from the inline row button removes the connector from the list', async ({ page }) => {
  const name = trackMongoName('inline_delete')

  await gotoDatabases(page)
  await createMongoConnector(page, { name, connectionString: MONGO_URI, database: DB_NAME })

  await connectorRow(page, name)
    .getByRole('button', { name: 'Delete connector', exact: true })
    .click()
  const deleteDialog = page.getByRole('dialog', { name: 'Delete connection' })
  await expect(deleteDialog).toBeVisible()
  await deleteDialog.getByRole('button', { name: 'Delete connection', exact: true }).click()

  await expect(deleteDialog).toHaveCount(0)
  await expect(connectorRowsByName(page, name)).toHaveCount(0)
})

test('settings/databases: confirming delete from the edit form resets the draft and removes the row', async ({ page }) => {
  const name = trackMongoName('edit_delete')

  await gotoDatabases(page)
  await createMongoConnector(page, { name, connectionString: MONGO_URI, database: DB_NAME })
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible()

  await page
    .locator('.settings-form-actions')
    .getByRole('button', { name: 'Delete connector', exact: true })
    .click()
  const deleteDialog = page.getByRole('dialog', { name: 'Delete connection' })
  await deleteDialog.getByRole('button', { name: 'Delete connection', exact: true }).click()

  await expect(connectorRowsByName(page, name)).toHaveCount(0)
  // deleteSuccess wasEditing branch resets the form to the default mongo draft.
  await expect(page.getByLabel('Connection name')).toHaveValue('local-mongo')
  await expect(page.getByRole('button', { name: 'Open connection', exact: true })).toBeVisible()
})

test('settings/databases: cancelling the delete modal keeps the db connector in the list', async ({ page }) => {
  const name = trackMongoName('delete_cancel')

  await gotoDatabases(page)
  await createMongoConnector(page, { name, connectionString: MONGO_URI, database: DB_NAME })

  await connectorRow(page, name)
    .getByRole('button', { name: 'Delete connector', exact: true })
    .click()
  const deleteDialog = page.getByRole('dialog', { name: 'Delete connection' })
  await deleteDialog.getByRole('button', { name: 'Cancel', exact: true }).click()

  await expect(deleteDialog).toHaveCount(0)
  await expect(connectorRow(page, name)).toBeVisible()
})

test('settings/databases: clicking New connection while editing resets the form back to defaults', async ({ page }) => {
  const name = trackMongoName('new_resets')

  await gotoDatabases(page)
  await createMongoConnector(page, { name, connectionString: MONGO_URI, database: DB_NAME })
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'New connection', exact: true }).click()

  await expect(page.getByLabel('Connection name')).toHaveValue('local-mongo')
  await expect(page.getByLabel('Connection string')).toHaveValue(MONGO_URI)
  await expect(page.getByLabel('Database name')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Open connection', exact: true })).toBeVisible()
  await expect(page.getByText(`Editing connection "${name}".`)).toHaveCount(0)
})

test('settings/databases: Refresh connections triggers a GET and keeps the row visible', async ({ page }) => {
  const name = trackMongoName('refresh')

  await gotoDatabases(page)
  await createMongoConnector(page, { name, connectionString: MONGO_URI, database: DB_NAME })

  const refetch = page.waitForResponse(
    (res) =>
      res.url().includes('/api/db/connectors/configurations') &&
      res.request().method() === 'GET' &&
      res.ok(),
  )
  await page.getByRole('button', { name: 'Refresh connections', exact: true }).click()
  await refetch

  await expect(connectorRow(page, name)).toBeVisible()
})

test('settings/databases: connection-string credentials are masked when rendering the list', async ({ page }) => {
  // maskConnectionString runs purely on the FE — feed a synthetic GET so the
  // assertion does not depend on whatever shape the BE happens to persist.
  // The URL constructor branch fires for parseable URIs and replaces the
  // password with the bullet glyph used by the component.
  await page.route('**/api/db/connectors/configurations', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            type: 'mongodb',
            name: 'masked',
            connectionString: 'mongodb://user:supersecret@host:27017/db',
            database: 'db',
            connected: true,
            authenticated: true,
          },
        ]),
      })
      return
    }
    await route.continue()
  })

  await gotoDatabases(page)
  const row = page.locator('.settings-connector-item').filter({ hasText: 'masked' })
  // Critical guarantee — the raw password must NOT leak into the rendered
  // DOM. We assert structural fragments around the password rather than the
  // exact bullet encoding because URL.toString() may render the bullet glyph
  // either literally (`••••`) or percent-encoded (`%E2%80%A2…`) depending on
  // how the runtime treats the mongodb: non-special scheme.
  await expect(row).not.toContainText('supersecret')
  await expect(row).toContainText('mongodb://user:')
  await expect(row).toContainText('@host:27017/db')
})

test('settings/databases: a 5xx on db connector create surfaces the backend error as a toast', async ({ page }) => {
  await page.route('**/api/db/connectors/configurations', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'DB exploded' }),
      })
      return
    }
    await route.continue()
  })

  await gotoDatabases(page)
  await fillByLabel(page, 'Connection name', 'broken')
  await fillByLabel(page, 'Database name', 'broken_db')
  await page.getByRole('button', { name: 'Open connection', exact: true }).click()

  await expect(page.getByText('DB exploded')).toBeVisible()
  // submitFailed flips isSubmitting off and changes nothing else — the form
  // is still on Open connection (no editingConnectorName set).
  await expect(page.getByRole('button', { name: 'Open connection', exact: true })).toBeVisible()
})

test('settings/databases: a 5xx on db connector list surfaces a connectionsError under the list heading', async ({ page }) => {
  await page.route('**/api/db/connectors/configurations', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'DB list exploded' }),
      })
      return
    }
    await route.continue()
  })

  await gotoDatabases(page)
  await expect(page.locator('.settings-error')).toHaveText('DB list exploded')
})

test('settings/databases: empty db connector list shows the no-connections placeholder', async ({ page }) => {
  await page.route('**/api/db/connectors/configurations', async (route) => {
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

  await gotoDatabases(page)
  await expect(page.getByText('No database connections configured.')).toBeVisible()
})

function trackMongoName(kind: string): string {
  const name = `${NAME_PREFIX}_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  createdConnectors.push({ type: 'mongodb', name })
  return name
}

async function gotoDatabases(page: Page): Promise<void> {
  await page.goto('/settings')
  // Brokers tab is selected by default — click into Databases and wait for
  // its tabpanel to swap in before any locator queries.
  await page.getByRole('tab', { name: 'Databases', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Database configuration' })).toBeVisible()
}

async function createMongoConnector(
  page: Page,
  options: { name: string; connectionString: string; database: string },
): Promise<void> {
  await fillByLabel(page, 'Connection name', options.name)
  await fillByLabel(page, 'Connection string', options.connectionString)
  await fillByLabel(page, 'Database name', options.database)
  await page.getByRole('button', { name: 'Open connection', exact: true }).click()
  // submitSuccess sets editingConnectorName, so the button flips to Save
  // changes the moment the POST resolves — deterministic readiness signal.
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible()
  // submitSuccess in the db tab also kicks off a refresh; wait for the row.
  await expect(connectorRow(page, options.name)).toBeVisible()
}

function connectorRow(page: Page, name: string): Locator {
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
