import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DispatchTabBar } from './DispatchTabBar'
import type { DispatchTabBarProps } from '../../../types/messageDispatch.view.types'

const noop = () => {}

const baseProps: DispatchTabBarProps = {
  tabs: [
    { id: 'a', title: 'Untitled', isActive: true, broker: null, contentMode: 'json' },
    { id: 'b', title: 'orders-req', isActive: false, broker: 'kafka', contentMode: 'protobuf' },
  ],
  onSelect: noop,
  onClose: noop,
  onNewTab: noop,
}

describe('DispatchTabBar', () => {
  it('renders a label for every tab', () => {
    const html = renderToStaticMarkup(<DispatchTabBar {...baseProps} />)
    expect(html).toContain('Untitled')
    expect(html).toContain('orders-req')
  })

  it('marks the active tab with aria-current', () => {
    const html = renderToStaticMarkup(<DispatchTabBar {...baseProps} />)
    expect(html).toContain('aria-current="true"')
    expect(html).toContain('is-active')
  })

  it('gives each close button an accessible, tab-specific label', () => {
    const html = renderToStaticMarkup(<DispatchTabBar {...baseProps} />)
    expect(html).toContain('Close tab: Untitled')
    expect(html).toContain('Close tab: orders-req')
  })

  it('renders a new-tab button', () => {
    const html = renderToStaticMarkup(<DispatchTabBar {...baseProps} />)
    expect(html).toContain('aria-label="New tab"')
  })

  it('shows a broker badge only for tabs bound to a connector', () => {
    const html = renderToStaticMarkup(<DispatchTabBar {...baseProps} />)
    expect(html).toContain('dispatch-tab__broker--kafka')
    expect(html).toContain('Kafka')
    expect(html).not.toContain('dispatch-tab__broker--rabbit')
  })

  it('shows the wire format on every tab', () => {
    const html = renderToStaticMarkup(<DispatchTabBar {...baseProps} />)
    expect(html).toContain('dispatch-tab__format--json')
    expect(html).toContain('JSON')
    expect(html).toContain('dispatch-tab__format--protobuf')
    expect(html).toContain('Proto')
  })
})
