// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { I18nProvider, translateFor, useI18n } from './I18nProvider'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const LOCALE_STORAGE_KEY = 'devset.locale'

let container: HTMLDivElement | null = null
let root: Root | null = null
let latest: ReturnType<typeof useI18n>

function Probe() {
  latest = useI18n()
  return null
}

function mount() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() =>
    root?.render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    ),
  )
}

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.lang = ''
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  container = null
  root = null
})

describe('I18nProvider', () => {
  it('defaults to English and persists it to localStorage and <html lang>', () => {
    mount()
    expect(latest.locale).toBe('en')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('resolves the initial locale from a previously saved value', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'pl')
    mount()
    expect(latest.locale).toBe('pl')
  })

  it('falls back to English for an unrecognised saved value', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'de')
    mount()
    expect(latest.locale).toBe('en')
  })

  it('re-persists the locale and updates <html lang> when setLocale is called', () => {
    mount()
    act(() => latest.setLocale('pl'))
    expect(latest.locale).toBe('pl')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('pl')
    expect(document.documentElement.lang).toBe('pl')
  })

  it('interpolates {placeholder} params into the translated template', () => {
    mount()
    expect(latest.t('flow.nodeLabel.format', { stage: 'stage-1', event: 'event-1' })).toBe('Node: stage-1 (event-1)')
  })

  it('returns the raw template when no params are given', () => {
    mount()
    expect(latest.t('flow.nodeLabel.none')).toBe('No node selected')
  })

  it('falls back to the key itself for an unknown translation key', () => {
    mount()
    expect(latest.t('totally.unknown.key')).toBe('totally.unknown.key')
  })

  it('leaves an unmatched placeholder untouched', () => {
    mount()
    expect(latest.t('flow.nodeLabel.format', { stage: 'stage-1' })).toBe('Node: stage-1 ({event})')
  })
})

describe('useI18n', () => {
  it('throws when used outside an I18nProvider', () => {
    function Bare() {
      useI18n()
      return null
    }
    const el = document.createElement('div')
    document.body.appendChild(el)
    const bareRoot = createRoot(el)
    expect(() => act(() => bareRoot.render(<Bare />))).toThrow('useI18n must be used within I18nProvider')
    act(() => bareRoot.unmount())
    el.remove()
  })
})

describe('translateFor', () => {
  it('translates a key for the given locale outside of React', () => {
    expect(translateFor('en', 'flow.nodeLabel.none')).toBe('No node selected')
  })

  it('falls back to English then the key itself when missing', () => {
    expect(translateFor('pl', 'totally.unknown.key')).toBe('totally.unknown.key')
  })
})
