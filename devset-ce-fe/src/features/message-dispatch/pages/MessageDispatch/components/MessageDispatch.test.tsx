import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { MessageDispatchProps } from '../../../types/messageDispatch.view.types'

vi.mock('./DispatchCollectionContextModal', () => ({ DispatchCollectionContextModal: () => null }))
vi.mock('./DispatchCollectionsPanel', () => ({ DispatchCollectionsPanel: () => null }))
vi.mock('./DispatchHistoryPanel', () => ({ DispatchHistoryPanel: () => <div data-testid="history-panel" /> }))
vi.mock('./DispatchHistoryPreviewModal', () => ({ DispatchHistoryPreviewModal: () => null }))
vi.mock('./DispatchRequestCard', () => ({ DispatchRequestCard: () => null }))
vi.mock('./DispatchTabBar', () => ({ DispatchTabBar: () => null }))

import { MessageDispatch } from './MessageDispatch'

const baseProps = {
  collectionsPanel: {},
  collectionContextModal: {},
  requestCard: {},
  tabBar: {},
  historyPanel: {},
  historyPreviewModal: {},
} as unknown as MessageDispatchProps

describe('MessageDispatch', () => {
  it('applies the closed layout class and hides the history panel by default', () => {
    const html = renderToStaticMarkup(<MessageDispatch {...baseProps} isHistoryPanelOpen={false} />)
    expect(html).toContain('is-history-closed')
    expect(html).not.toContain('history-panel')
  })

  it('applies the open layout class and renders the history panel when open', () => {
    const html = renderToStaticMarkup(<MessageDispatch {...baseProps} isHistoryPanelOpen={true} />)
    expect(html).toContain('is-history-open')
    expect(html).toContain('history-panel')
  })
})
