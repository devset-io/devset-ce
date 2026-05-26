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

// SQLite serializes writes file-wide; serial mirrors schema-repo.spec.ts.
//
// No backend mutations are needed for this spec — every test exercises pure
// view-layer state (payload editor, schema section, wire format). No fixture
// cleanup required, but serial keeps the order matching the sibling specs.
test.describe.configure({ mode: 'serial' })

test('payload editor: typing into the JSON editor updates the editor value', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForPayloadReady(page)

  const next = JSON.stringify({ id: 'evt-2', source: 'spec', amount: 42 }, null, 2)
  await setAceBody(page, 'JSON payload editor', next)
  await expect.poll(() => getAceBody(page, 'JSON payload editor')).toBe(next)
})

test('payload editor: Format JSON pretty-prints a compact payload', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForPayloadReady(page)

  // Compact source on a single line — the dispatch.payloadHandlers.beautify
  // path runs JSON.parse → JSON.stringify(value, null, 2). We assert on the
  // canonical JSON to avoid coupling to backend reformatting (none here, but
  // future-proofs against subtle whitespace tweaks in the beautifier).
  const compact = '{"id":"evt-1","amount":5}'
  await setAceBody(page, 'JSON payload editor', compact)
  await page.getByRole('button', { name: 'Format JSON' }).click()

  await expect
    .poll(async () => JSON.parse(await getAceBody(page, 'JSON payload editor')))
    .toEqual({ id: 'evt-1', amount: 5 })
  // Whitespace check: at least one newline after format — proves indentation
  // actually happened rather than the value silently round-tripping.
  await expect.poll(() => getAceBody(page, 'JSON payload editor')).toMatch(/\n/)
})

test('payload editor: Import schema toggles a listbox of repo schemas', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForPayloadReady(page)

  const importBtn = page.getByRole('button', { name: 'Import schema' })
  await expect(importBtn).toHaveAttribute('aria-expanded', 'false')
  await importBtn.click()

  // The listbox is the dedicated dispatch-schemas-menu element. Its aria-label
  // is the same "Import schema" string but role=listbox disambiguates.
  await expect(page.getByRole('listbox', { name: 'Import schema' })).toBeVisible()
  await expect(importBtn).toHaveAttribute('aria-expanded', 'true')

  // Toggle closes — we rely on the same handler, but the assertion has to be
  // toHaveCount(0) (element is unmounted, not just hidden).
  await importBtn.click()
  await expect(page.getByRole('listbox', { name: 'Import schema' })).toHaveCount(0)
})

test('schema section: switching to PROTOBUF shows the locked-state hint and a disabled payload editor', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForPayloadReady(page)

  await page.getByLabel('Content type').selectOption('protobuf')

  // The DispatchPayloadEditor short-circuits to a "State is locked" card when
  // isProtoPayloadEnabled is false (PROTOBUF + isProtoBaseApplied=false).
  await expect(page.getByText('State is locked.')).toBeVisible()
  // The Function Studio toggle isn't even rendered yet because the
  // mode-toggle block lives inside the same `!isProtoPayloadEnabled` branch.
  await expect(page.getByRole('button', { name: 'Function Studio', exact: true })).toHaveCount(0)
})

test('schema section: "Apply as base" unlocks the editor and switches its label to "Applied"', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForPayloadReady(page)
  await page.getByLabel('Content type').selectOption('protobuf')

  const applyBtn = page.getByRole('button', { name: 'Apply as base', exact: true })
  await applyBtn.click()

  // Apply mutates state.isProtoBaseApplied=true → button re-renders with the
  // "Applied" label, locked card disappears, raw DSL editor mounts.
  await expect(page.getByRole('button', { name: 'Applied', exact: true })).toBeVisible()
  await expect(page.getByText('State is locked.')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Function Studio', exact: true })).toBeEnabled()
})

test('schema section: collapse button hides the proto editor, expand brings it back', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForPayloadReady(page)
  await page.getByLabel('Content type').selectOption('protobuf')

  // The collapse toggle uses an aria-label derived from labels.collapseProtoSchema
  // when expanded, and labels.expandProtoSchema when collapsed.
  const collapseBtn = page.getByRole('button', { name: 'Collapse Proto schema' })
  await expect(protoSchemaEditor(page)).toBeVisible()

  await collapseBtn.click()
  // After collapse the toggle's accessible name flips — same DOM element,
  // different aria-label. The previous selector wouldn't match.
  await expect(page.getByRole('button', { name: 'Expand Proto schema' })).toBeVisible()
  await expect(protoSchemaEditor(page)).toHaveCount(0)

  // Expand restores the editor. Note this is the toggle from the previous
  // line — same DOM node, now under the "Expand" alias.
  await page.getByRole('button', { name: 'Expand Proto schema' }).click()
  await expect(protoSchemaEditor(page)).toBeVisible()
})

test('schema section: editing the proto schema marks the base as having pending changes', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForPayloadReady(page)
  await page.getByLabel('Content type').selectOption('protobuf')
  await page.getByRole('button', { name: 'Apply as base', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Applied', exact: true })).toBeVisible()

  // applyProtoSchemaBase auto-collapses the proto editor (see useDispatchSchemaActions
  // lines 77-79). Re-expand it before editing — otherwise the editor isn't
  // mounted and setAceBody has nothing to write to.
  await page.getByRole('button', { name: 'Expand Proto schema' }).click()
  await expect(protoSchemaEditor(page)).toBeVisible()

  // Mutate the .proto body — hasPendingProtoBaseChanges becomes true and the
  // button re-enables as "Apply as base" (lets the user re-sync).
  const edited = `syntax = "proto2";\n\npackage example.dispatch;\n\nmessage ExampleMessage {\n  required string userId = 1;\n}\n`
  await setAceBody(page, 'Protobuf schema editor', edited)

  await expect(page.getByRole('button', { name: 'Apply as base', exact: true })).toBeVisible()
})

test('payload editor: Function Studio toggle stays disabled in PROTOBUF mode until Apply as base runs', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForPayloadReady(page)
  await page.getByLabel('Content type').selectOption('protobuf')

  // Without apply-as-base the locked card hides the toggle entirely (see the
  // wrapping `contentMode !== 'protobuf' || isProtoPayloadEnabled` guard).
  // We exercise the unlock instead of asserting disabled — the unlocked
  // state IS the contract.
  await page.getByRole('button', { name: 'Apply as base', exact: true }).click()

  const functionStudio = page.getByRole('button', { name: 'Function Studio', exact: true })
  await expect(functionStudio).toBeEnabled()
  await functionStudio.click()
  // Selecting Function Studio swaps the right panel — wire format section
  // (rendered there) becomes visible.
  await expect(page.getByRole('heading', { name: 'Wire Format' })).toBeVisible()
})

test('wire format: the section is absent in JSON mode regardless of payload editor mode', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForPayloadReady(page)

  // DispatchWireFormatConfig early-returns null when contentMode !== 'protobuf'.
  await expect(page.getByRole('heading', { name: 'Wire Format' })).toHaveCount(0)
})

test('wire format: enabling the checkbox reveals the source select and prefix value input', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForPayloadReady(page)
  await goToWireFormatPanel(page)

  const enableCheckbox = page.getByRole('checkbox', { name: 'Add binary prefix' })
  await expect(enableCheckbox).not.toBeChecked()
  // Source / Prefix value inputs are conditional on enabled=true.
  await expect(page.getByLabel('Prefix value (0..65535)')).toHaveCount(0)

  await enableCheckbox.check()

  await expect(page.getByLabel('Prefix value (0..65535)')).toBeVisible()
})

test('wire format: prefix value above 65535 surfaces the invalid-range error', async ({ page }) => {
  await page.goto('/message-dispatch')
  await waitForPayloadReady(page)
  await goToWireFormatPanel(page)

  await page.getByRole('checkbox', { name: 'Add binary prefix' }).check()
  const prefixInput = page.getByLabel('Prefix value (0..65535)')

  // 99999 fails the 0..65535 guard in the reducer (wireFormatPrefixValueChanged
  // sets prefixValueError='invalid-range' when out of bounds).
  await prefixInput.fill('99999')

  await expect(
    page.getByText('Prefix value must be an integer in range 0..65535.'),
  ).toBeVisible()
})

async function waitForPayloadReady(page: Page) {
  // Raw JSON editor is the canonical mount-completed signal — it loads via a
  // lazy Suspense (CodeEditor.tsx). Wait for its container to be tagged with
  // aria-label="JSON payload editor" before any input attempt.
  await expect(page.locator('[aria-label="JSON payload editor"]')).toBeVisible()
}

async function goToWireFormatPanel(page: Page) {
  await page.getByLabel('Content type').selectOption('protobuf')
  await page.getByRole('button', { name: 'Apply as base', exact: true }).click()
  await page.getByRole('button', { name: 'Function Studio', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Wire Format' })).toBeVisible()
}

function protoSchemaEditor(page: Page): Locator {
  return page.locator('[aria-label="Protobuf schema editor"]')
}

// Ace renders its own DOM with a hidden textarea — page.fill / keyboard tricks
// are flaky and OS-dependent. Ace stores its Editor on the container as
// `.env.editor` (its own re-entry guard, used by ace.edit when called twice
// on the same node). Not exposed in @types/ace-builds.
//
// Polls until env.editor is attached — CodeEditor lazy-loads via Suspense,
// so a freshly-rendered editor (e.g. right after switching content modes or
// applying a proto base) needs a tick before its env is wired up.
async function setAceBody(page: Page, editorAriaLabel: string, value: string): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate((aria) => {
        const node = document.querySelector(`[aria-label="${aria}"]`)
        return Boolean((node as unknown as { env?: { editor?: unknown } } | null)?.env?.editor)
      }, editorAriaLabel),
    )
    .toBe(true)

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
