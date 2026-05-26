/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // SQLite serializes writes file-wide and the dev backend uses a single
  // shared DB file across the whole suite. Parallel workers reliably trip
  // [SQLITE_BUSY] on concurrent POST /api/collection (and similar writes),
  // leaking failures into tests that have nothing to do with the conflict.
  // Single worker is the cheapest fix; spec files keep `serial` for clarity.
  //
  // TODO(be): set `PRAGMA journal_mode=WAL;` + `PRAGMA busy_timeout=5000;` on
  // the Hikari pool's connection init (e.g. via `spring.datasource.hikari.
  // connection-init-sql`) so the SQLite writer doesn't block readers and
  // contended writes retry transparently. With that in place this file can
  // go back to `fullyParallel: true` and remove the `workers: 1` cap, cutting
  // suite wall time roughly proportionally to spec count.
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8082',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
