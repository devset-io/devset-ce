/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { expect, test } from '@playwright/test'

test('full stack smoke: SPA mounts and backend serves /api/workflows', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.locator('#root .app-shell')).toBeVisible()

  const workflows = await request.get('/api/workflows')
  expect(workflows.status()).toBe(200)
  expect(Array.isArray(await workflows.json())).toBe(true)
})
