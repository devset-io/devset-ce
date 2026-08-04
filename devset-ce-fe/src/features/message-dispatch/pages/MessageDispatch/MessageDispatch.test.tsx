// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../../core/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('./hooks/MessageDispatch.hooks', () => ({
  useMessageDispatch: vi.fn(() => ({ marker: 'message-dispatch-props' })),
}))

vi.mock('./components/MessageDispatch', () => ({
  MessageDispatch: (props: Record<string, unknown>) => <div data-testid="rendered" data-marker={String(props.marker)} />,
}))

import { MessageDispatchContainer } from './MessageDispatch'
import { useMessageDispatch } from './hooks/MessageDispatch.hooks'

const useMessageDispatchMock = vi.mocked(useMessageDispatch)

describe('MessageDispatchContainer', () => {
  it('builds labels via t(), calls useMessageDispatch, and forwards its props', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => root.render(<MessageDispatchContainer />))

    expect(useMessageDispatchMock).toHaveBeenCalledTimes(1)
    const options = useMessageDispatchMock.mock.calls[0][0]
    expect(options.labels.collections.title).toBe('dispatch.collections.title')
    expect(options.labels.request.send).toBe('dispatch.request.send')
    expect(container.querySelector('[data-testid="rendered"]')?.getAttribute('data-marker')).toBe('message-dispatch-props')

    act(() => root.unmount())
    container.remove()
  })
})
