import { describe, expect, it } from 'vitest'
import { createInitialState, reducer } from './MessageDispatch.reducer'
import { serializeWorkspace } from './MessageDispatch.tabs'

describe('serializeWorkspace', () => {
  it('stashes the live form into the active tab snapshot', () => {
    const state = reducer(createInitialState(), { type: 'topicChanged', value: 'orders' })

    const workspace = serializeWorkspace(state)

    expect(workspace.activeTabId).toBe(state.activeTabId)
    expect(workspace.tabs[0].formSnapshot?.topicRaw).toBe('orders')
  })

  it('captures activeHistoryRef from the loaded history id', () => {
    const state = reducer(createInitialState(), {
      type: 'historyEntryLoaded',
      metadata: { executions: 1, stage: 's', event: 'e', headers: {} },
      historyId: 'hist-42',
    })

    const workspace = serializeWorkspace(state)

    expect(workspace.tabs[0].activeHistoryRef).toBe('hist-42')
  })
})
