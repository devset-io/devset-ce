/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

// ──────────────────────────────────────────────────────────────
// Tailwind class constants for the flow-builder feature.
//
// All visual styling lives here as reusable string constants.
// Components import and use these instead of custom CSS classes.
// Dark mode variants use the `dark:` prefix (enabled via
// `darkMode: ['selector', '[data-theme="dark"]']` in tailwind.config.js).
// ──────────────────────────────────────────────────────────────

// ── Shared / generic ──

export const FB_UI = {
  card: 'rounded-xl border border-[var(--line-200)] bg-[var(--panel)] p-3 shadow-[0_6px_18px_rgba(40,61,95,0.08)]',
  input:
    'mt-1 w-full rounded-lg border border-[var(--line-300)] bg-[var(--panel-soft)] px-2.5 py-2 text-sm text-[var(--ink-900)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]',
  label: 'block text-sm text-[var(--ink-700)]',
  hint: 'text-xs text-[var(--ink-500)]',
  secondaryButton:
    'rounded-lg border border-[var(--line-300)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold text-[var(--ink-900)] transition hover:border-[var(--brand-border)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-ink)]',
  primaryButton:
    'rounded-lg border border-[var(--brand)] bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition hover:border-[var(--brand-strong)] hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60',
  modalBackdrop: 'fixed inset-0 flex items-center justify-center bg-[rgba(8,18,12,0.44)] p-5',
  modalCard:
    'flex w-full flex-col overflow-hidden rounded-xl border border-[var(--line-200)] bg-[var(--panel)] p-3 shadow-[0_6px_18px_rgba(40,61,95,0.08)]',
} as const

export const buildPillButtonClass = (active: boolean) =>
  `rounded-full border px-2.5 py-1 text-xs transition ${
    active
      ? 'border-[var(--brand)] bg-[var(--brand-soft)] font-semibold text-[var(--brand-ink)]'
      : 'border-[var(--line-300)] bg-[var(--panel-soft)] text-[var(--ink-900)] hover:border-[var(--brand-border)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-ink)]'
  }`

export const buildTabButtonClass = (active: boolean) =>
  `rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
    active
      ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-ink)]'
      : 'border-[var(--line-300)] bg-[var(--panel-soft)] text-[var(--ink-900)] hover:border-[var(--brand-border)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-ink)]'
  }`

// ── Layout ──

export const FB_LAYOUT = {
  grid: 'grid grid-cols-[minmax(0,1fr)_360px] gap-4 min-h-[calc(100vh-165px)] max-lg:grid-cols-1',
  canvas:
    'overflow-hidden rounded-2xl border border-[var(--line-200)] bg-[var(--panel)] shadow-[0_8px_28px_rgba(25,45,74,0.09)] dark:border-[var(--line-200)] dark:bg-[var(--panel)] dark:shadow-[var(--shadow-card)]',
  flowWrap:
    'h-[calc(100%-72px)] min-h-[510px] bg-gradient-to-b from-[#f7faff] to-[#f2f7ff] max-lg:min-h-[430px] dark:bg-none dark:bg-[var(--panel-deep)]',
} as const

// ── Toolbar ──

export const FB_TOOLBAR = {
  bar: 'flex items-center justify-between border-b border-[var(--line-200)] bg-gradient-to-b from-white to-[#f4f8ff] px-3.5 pb-3 pt-3.5 dark:border-b-[var(--line-200)] dark:bg-none dark:bg-[var(--panel-soft)]',
  barTitle: 'm-0',
  barSubtitle: 'mt-1 text-[0.88rem] text-[#557097] dark:text-[var(--ink-700)]',
  actions: 'flex gap-2',
  button:
    'min-h-[38px] cursor-pointer rounded-[10px] border border-[var(--brand)] bg-[var(--brand)] px-3.5 py-2.5 font-bold tracking-[0.01em] text-white transition-all duration-150 hover:-translate-y-px hover:border-[var(--brand-strong)] hover:bg-[var(--brand-strong)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-[0.58] disabled:translate-y-0 dark:border-[var(--brand-strong)] dark:bg-[var(--brand)] dark:text-[#eaf9f1] dark:shadow-[0_6px_14px_rgba(18,34,27,0.32)] dark:hover:border-[#58c597] dark:hover:bg-[#56c596]',
  buttonGhost:
    'min-h-[38px] cursor-pointer rounded-[10px] border border-[var(--brand-border)] bg-white px-3.5 py-2.5 font-bold tracking-[0.01em] text-[var(--brand-ink)] transition-all duration-150 hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-[0.58] disabled:translate-y-0 dark:border-[var(--line-300)] dark:bg-[var(--panel)] dark:text-[var(--ink-900)] dark:hover:border-[var(--brand-border)] dark:hover:bg-[var(--brand-soft)] dark:hover:text-[var(--brand-ink)]',
} as const

// ── Builder Node ──

export const FB_NODE = {
  root: 'relative w-[242px] rounded-xl border border-[#bfd1ec] bg-white p-2.5 shadow-[0_6px_18px_rgba(40,61,95,0.13)] dark:border-[#2c4a3d] dark:bg-[#203329] dark:shadow-[0_10px_20px_rgba(0,0,0,0.34)]',
  rootSelected: 'border-[var(--brand)] shadow-[0_0_0_3px_rgba(31,159,99,0.2)]',
  deleteBtn:
    'absolute right-[7px] top-[7px] z-[3] inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-[#e6b2bb] bg-[#fff2f4] text-[0.74rem] font-bold leading-none text-[#b4233c] transition-colors hover:border-[#d37d8c] hover:bg-[#ffe4e8] hover:text-[#8f1530] dark:border-[#7a4651] dark:bg-[#3b2329] dark:text-[#ffccd6] dark:hover:border-[#995966] dark:hover:bg-[#4a2a31] dark:hover:text-[#ffdbe3]',
  handle: 'h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--brand)]',
  handleTarget: '!left-[-6px]',
  handleSource: '!right-[-6px]',
  handleState: 'h-2 w-2 border-[1.5px] border-white bg-[#94a3b8] opacity-[0.92]',
  handleStateTarget: '!top-[-5px] !left-1/2 !-translate-x-1/2',
  handleStateSource: '!right-[-5px] !top-[73%]',
  top: 'mb-[7px] flex items-center justify-between gap-2 pr-6',
  title: 'flex min-w-0 items-center gap-2',
  titleStrong: 'overflow-hidden text-ellipsis whitespace-nowrap dark:text-[#e7f1ec]',
  dot: 'h-2 w-2 shrink-0 rounded-full',
  flags: 'inline-flex shrink-0 flex-nowrap items-center justify-end gap-1',
  flag: 'inline-flex h-[17px] items-center whitespace-nowrap rounded-full px-1.5 text-[0.56rem] font-extrabold tracking-[0.04em] leading-[1.1] dark:border-[#365042] dark:bg-[#21372d] dark:text-[#cde5d9]',
  flagOrder: 'border border-[#c9d5f7] bg-[#eef2ff] text-[#3348a3] dark:border-[#47556c] dark:bg-[#2a3344] dark:text-[#d9e4ff]',
  flagStart: 'border border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-ink)] dark:border-[#3e7b5f] dark:bg-[#24513d] dark:text-[#d8f6e9]',
  flagEnd: 'border border-[#c9d5f7] bg-[#edf2ff] text-[#27408b] dark:border-[#47556c] dark:bg-[#2a3344] dark:text-[#d9e4ff]',
  event: 'mb-1.5 text-[0.78rem] text-[#486182] dark:text-[#c0d7cc]',
  stage: 'mb-[7px] text-[0.76rem] text-[#5c7498] dark:text-[#d7e7df]',
  insights: 'flex flex-wrap items-center gap-1',
  insight:
    'inline-flex items-center rounded-full border border-[#d9e4f4] bg-[#f7faff] px-1.5 py-0.5 text-[0.6rem] font-bold tracking-[0.01em] text-[#395376] dark:border-[#3b5648] dark:bg-[#1f3329] dark:text-[#d4e5dc]',
  insightState: 'border-[#d8e0ea] bg-[#f4f7fb] text-[#43556d] dark:border-[#47556c] dark:bg-[#283241] dark:text-[#cfdbef]',
  insightRepeat: 'border-[#c9d5f7] bg-[#eef2ff] text-[#3348a3] dark:border-[#3e5a4c] dark:bg-[#21372d] dark:text-[#d4e9de]',
  insightEmit: 'border-[#d6dee9] bg-[#f3f6fa] text-[#42556f] dark:border-[#3f584b] dark:bg-[#21352b] dark:text-[#d2e4db]',
  insightEmitOn: 'border-[#bfe2cf] bg-[#eaf7f0] text-[#1f7d52] dark:border-[#2f7a58] dark:bg-[#1f4b37] dark:text-[#bff0d9]',
  insightEmitOff: 'border-[#f3c7cc] bg-[#fff0f2] text-[#b4233a] dark:border-[#884150] dark:bg-[#45232b] dark:text-[#ffd5db]',
} as const

// ── Workflow State Node ──

export const FB_STATE_NODE = {
  root: 'w-[250px] rounded-xl border border-[var(--brand-border)] bg-white p-2.5 shadow-[0_6px_18px_rgba(27,94,63,0.13)] dark:border-[#3f5d4e] dark:bg-[#243a2f] dark:shadow-[0_10px_20px_rgba(0,0,0,0.32)]',
  rootSelected: 'border-[var(--brand)] shadow-[0_0_0_3px_rgba(31,159,99,0.2)]',
  top: 'mb-2 flex items-center justify-between',
  topSpan: 'text-[0.78rem] text-[var(--brand-ink)] dark:text-[#d6ebe1]',
  meta: 'm-0 mb-2.5 text-[0.78rem] text-[var(--brand-ink-muted)] dark:text-[#d6ebe1]',
  empty: 'm-0 mb-2.5 text-[0.78rem] text-[var(--brand-ink-muted)] dark:text-[#d6ebe1]',
  addBtn:
    'cursor-pointer rounded-[10px] border border-[var(--brand-border)] bg-white px-2.5 py-[7px] font-bold text-[var(--brand-ink)] dark:border-[#4f7765] dark:bg-[#284334] dark:text-[#d9f3e7]',
  handle: 'h-2 w-2 rounded-full border-[1.5px] border-white bg-[#94a3b8]',
  handleTarget: '!bottom-[-5px]',
  handleSource: '!bottom-[-5px] !-translate-x-1/2',
  handleSourcePrimary: 'opacity-60',
  handleSourceRouting: 'h-1 w-1 border-0 bg-transparent opacity-0',
} as const

// ── Sidebar ──

export const FB_SIDEBAR = {
  actionsRow: 'flex flex-col gap-2',
  checkbox: 'flex! items-center gap-2 mt-1.5',
  checkboxInput: 'w-auto m-0',
  schemaError: 'text-[#b42318]',
} as const

// ── Function Builder ──

export const FB_FN = {
  builder: 'flex flex-col gap-2.5 dark:text-[var(--ink-800)]',
  fieldset: 'flex flex-col gap-2.5 border-0 p-0 m-0 disabled:opacity-60',
  label: 'block text-[0.84rem] text-[#334155] dark:text-[var(--ink-800)]',
  input:
    'mt-1 w-full rounded-lg border border-[#cbd5e1] bg-[#f8fafc] p-2 font-[inherit] dark:border-[var(--line-300)] dark:bg-[var(--panel-soft)] dark:text-[var(--ink-900)] dark:placeholder:text-[var(--ink-600)]',
  textarea:
    'mt-1 w-full resize-y rounded-lg border border-[#cbd5e1] bg-[#f8fafc] p-2 font-mono text-[0.74rem] font-[inherit] dark:border-[var(--line-300)] dark:bg-[var(--panel-soft)] dark:text-[var(--ink-900)] dark:placeholder:text-[var(--ink-600)]',
  textareaReadonly:
    'min-h-[78px] whitespace-pre-wrap break-all leading-[1.35] font-mono text-[0.78rem] dark:border-[var(--line-300)] dark:bg-[var(--panel-deep)] dark:text-[var(--ink-800)]',
  textareaEditable:
    "min-h-[120px] whitespace-pre-wrap break-all leading-[1.45] font-['Roboto_Mono','JetBrains_Mono','SF_Mono',SFMono-Regular,Menlo,Monaco,Consolas,monospace] text-[0.82rem]",
  button:
    'w-fit cursor-pointer rounded-[10px] border border-[var(--brand)] bg-[var(--brand)] px-2.5 py-2 font-bold text-white',
  buttonGhost: 'w-fit cursor-pointer rounded-[10px] border border-[var(--brand-border)] bg-white px-2.5 py-2 font-bold text-[var(--brand-ink)]',
  grid: 'grid grid-cols-2 gap-2',
  row: 'grid grid-cols-2 gap-2 mb-1.5',
  help: '-mt-0.5 mb-0.5 text-[0.76rem] leading-[1.35] text-[var(--brand-ink-muted)] dark:text-[var(--ink-800)]',
  helpInline: 'inline-flex items-center gap-1.5 -mt-0.5 mb-1 text-[0.76rem] text-[var(--brand-ink-muted)] dark:text-[var(--ink-800)]',
  helpTrigger:
    'relative inline-flex h-[18px] w-[18px] cursor-help items-center justify-center rounded-full border border-[var(--brand-border)] bg-white font-bold text-[var(--brand-ink)] dark:border-[var(--line-300)] dark:bg-[var(--panel)] dark:text-[var(--brand-ink)]',
  tooltip:
    'absolute left-0 top-[calc(100%+6px)] z-20 hidden w-[min(520px,72vw)] rounded-[10px] border border-[var(--brand-border)] bg-white p-2 px-2.5 text-[0.75rem] leading-[1.35] text-[var(--brand-ink)] shadow-[0_8px_20px_rgba(12,41,25,0.14)] group-hover:block dark:border-[var(--line-300)] dark:bg-[var(--panel)] dark:text-[var(--ink-900)] dark:shadow-[var(--shadow-card)]',
  tooltipCode: 'text-[0.72rem] break-all',
} as const

// ── Code Editor ──

export const FB_CODE_EDITOR = {
  input:
    "h-full w-full resize-none overflow-auto rounded-[10px] border border-[var(--brand-border)] bg-white p-2.5 px-3 font-['Roboto_Mono','JetBrains_Mono','SF_Mono',SFMono-Regular,Menlo,Monaco,Consolas,monospace] text-[0.8rem] leading-[1.48] text-[var(--ink-900)] focus:border-[var(--brand-border)] focus:outline-2 focus:outline-[var(--brand-soft)] focus:outline-offset-0 dark:border-[var(--line-300)] dark:bg-[var(--panel-deep)] dark:text-[var(--ink-900)]",
  fnEditorWrap: "font-['Roboto_Mono','JetBrains_Mono','SF_Mono',SFMono-Regular,Menlo,Monaco,Consolas,monospace] text-[0.82rem] leading-[1.5]",
  jsonEditorWrap: "font-['Roboto_Mono','JetBrains_Mono','SF_Mono',SFMono-Regular,Menlo,Monaco,Consolas,monospace] text-[0.8rem] leading-[1.48]",
} as const

// ── Function Preview ──

export const FB_PREVIEW = {
  rich: 'overflow-auto rounded-xl border border-[#d5e3f7] bg-gradient-to-b from-white to-[#f7faff] p-3 px-3.5 shadow-[inset_0_1px_0_#ffffff,0_6px_14px_rgba(26,115,232,0.08)] dark:border-[var(--line-300)] dark:bg-gradient-to-b dark:from-[var(--panel-soft)] dark:to-[var(--panel-deep)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_8px_18px_rgba(0,0,0,0.28)]',
  richLarge: 'min-h-[220px]',
  expression:
    "font-['Roboto_Mono','JetBrains_Mono','SF_Mono',SFMono-Regular,Menlo,Monaco,Consolas,monospace] text-[0.86rem] leading-[1.62] tracking-[0.01em] break-all text-[#202124] dark:text-[var(--ink-900)]",
  line: 'min-h-[1.45em] whitespace-nowrap',
  tokenPunct: 'text-[#5f6368] dark:text-[var(--ink-500)]',
  tokenArg: 'text-[#202124] dark:text-[#d7e3f5]',
} as const

// depth → color mapping for function name tokens
const FN_DEPTH_COLORS = [
  'text-[#1a73e8] dark:text-[#7db5ff]',
  'text-[#0b8043] dark:text-[#7fd8a8]',
  'text-[#9334e6] dark:text-[#cab3ff]',
  'text-[#f29900] dark:text-[#ffd28b]',
  'text-[#d93025] dark:text-[#ff9ca8]',
  'text-[#d93025] dark:text-[#ff9ca8]',
] as const

export const fnTokenFnClass = (depth: number) =>
  `font-bold ${FN_DEPTH_COLORS[Math.min(depth, 5)]}`

// ── Pills (kind badges) ──

export const FB_PILL = {
  base: 'inline-flex items-center justify-center rounded-full px-2 py-[3px] text-[0.7rem] font-bold uppercase',
  fn: 'bg-[var(--brand-soft)] text-[var(--brand-ink)]',
  ref: 'bg-[#def1f8] text-[#176788]',
  path: 'bg-[#e8f4ff] text-[#1d4f7a]',
  literal: 'bg-[#eceff4] text-[#4b5665]',
  when: 'bg-[#fff4df] text-[#805b10]',
  inherited: 'bg-[#fff4df] text-[#8a6113]',
} as const

export const pillClass = (kind: string) =>
  `${FB_PILL.base} ${FB_PILL[kind as keyof typeof FB_PILL] ?? FB_PILL.literal}` // SAFETY: kind may not be a valid key; nullish coalescing falls back to FB_PILL.literal

// ── Function Studio ──

export const FB_STUDIO = {
  body: 'bg-[color-mix(in_srgb,var(--panel-soft)_72%,transparent)] dark:bg-[var(--panel-deep)]',
  panel:
    'shadow-[0_6px_18px_rgba(40,61,95,0.08)] dark:border-[var(--line-200)] dark:bg-[var(--panel)]',
} as const
