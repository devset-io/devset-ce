import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

vi.mock('../../../shared/services/http-api.service', () => ({
  fetchApi: vi.fn(),
}))

import { fetchApi } from '../../../shared/services/http-api.service'
import { createApiWorkspaceRepository } from './dispatchWorkspace.repository'
import type { DispatchTab } from '../pages/MessageDispatch/state/MessageDispatch.tabs'

const fetchApiMock = fetchApi as unknown as Mock

const savedTab: DispatchTab = {
  id: 'tab-1',
  savedRequestRef: { collectionName: 'AAA', singleRequestName: 'req-a' },
  formSnapshot: null,
  activeHistoryRef: 'hist-7',
  title: 'req-a',
  order: 0,
}

const scratchTab: DispatchTab = {
  id: 'tab-2',
  savedRequestRef: null,
  formSnapshot: null,
  activeHistoryRef: null,
  title: 'Untitled',
  order: 1,
}

beforeEach(() => {
  fetchApiMock.mockReset()
})

describe('createApiWorkspaceRepository', () => {
  it('maps the backend workspace into dispatch tabs on load', async () => {
    fetchApiMock.mockResolvedValue({
      json: () =>
        Promise.resolve({
          activeTabId: 'tab-1',
          tabs: [
            {
              id: 'tab-1',
              collectionName: 'AAA',
              singleRequestName: 'req-a',
              activeHistoryId: 'hist-7',
              title: 'req-a',
              order: 0,
            },
          ],
        }),
    })

    const workspace = await createApiWorkspaceRepository().load()

    expect(fetchApiMock).toHaveBeenCalledWith('/dispatch-workspace', expect.objectContaining({ method: 'GET' }))
    expect(workspace).toEqual({
      activeTabId: 'tab-1',
      tabs: [
        {
          id: 'tab-1',
          savedRequestRef: { collectionName: 'AAA', singleRequestName: 'req-a' },
          formSnapshot: null,
          activeHistoryRef: 'hist-7',
          title: 'req-a',
          order: 0,
        },
      ],
    })
  })

  it('returns null when the backend body has no tabs array', async () => {
    fetchApiMock.mockResolvedValue({ json: () => Promise.resolve({ activeTabId: null }) })
    expect(await createApiWorkspaceRepository().load()).toBeNull()
  })

  it('sends only saved-request pointers (drops scratch and formSnapshot) on save', async () => {
    fetchApiMock.mockResolvedValue({ json: () => Promise.resolve({}) })

    await createApiWorkspaceRepository().save({ activeTabId: 'tab-1', tabs: [savedTab, scratchTab] })

    expect(fetchApiMock).toHaveBeenCalledTimes(1)
    const [path, options] = fetchApiMock.mock.calls[0]
    expect(path).toBe('/dispatch-workspace')
    expect(options.method).toBe('PUT')
    const body = JSON.parse(options.body)
    expect(body).toEqual({
      activeTabId: 'tab-1',
      tabs: [
        {
          id: 'tab-1',
          collectionName: 'AAA',
          singleRequestName: 'req-a',
          activeHistoryId: 'hist-7',
          title: 'req-a',
          order: 0,
        },
      ],
    })
  })
})
