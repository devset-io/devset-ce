import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { DispatchRequestCardProps } from '../../../types/messageDispatch.view.types'

vi.mock('./DispatchRequestHead', () => ({ DispatchRequestHead: () => null }))
vi.mock('./DispatchSaveModal', () => ({ DispatchSaveModal: () => null }))
vi.mock('./DispatchUpdateConfirmModal', () => ({ DispatchUpdateConfirmModal: () => null }))
vi.mock('./DispatchConnectorConfig', () => ({ DispatchConnectorConfig: () => null }))
vi.mock('./DispatchSchemaSection', () => ({ DispatchSchemaSection: () => null }))
vi.mock('./DispatchPayloadEditor', () => ({ DispatchPayloadEditor: () => null }))
vi.mock('./DispatchWireFormatConfig', () => ({ DispatchWireFormatConfig: () => null }))

import { DispatchRequestCard } from './DispatchRequestCard'

const baseProps = {} as unknown as DispatchRequestCardProps

describe('DispatchRequestCard', () => {
  it('renders without a config or send error', () => {
    const html = renderToStaticMarkup(<DispatchRequestCard {...baseProps} configError={null} sendError={null} />)
    expect(html).toContain('dispatch-request-card')
    expect(html).not.toContain('dispatch-error')
  })

  it('renders the config error banner when present', () => {
    const html = renderToStaticMarkup(<DispatchRequestCard {...baseProps} configError="config broke" sendError={null} />)
    expect(html).toContain('config broke')
  })

  it('renders the send error banner when present', () => {
    const html = renderToStaticMarkup(<DispatchRequestCard {...baseProps} configError={null} sendError="send broke" />)
    expect(html).toContain('send broke')
  })
})
