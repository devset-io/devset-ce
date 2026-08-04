import { describe, expect, it } from 'vitest'
import {
  createHybridWorkspaceRepository,
  createLocalStorageWorkspaceRepository,
  type DispatchWorkspaceRepository,
} from './dispatchWorkspace.repository'
import type { DispatchTab, PersistedWorkspace } from '../pages/MessageDispatch/state/MessageDispatch.tabs'

const fakeStorage = () => {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
  }
}

const workspace: PersistedWorkspace = {
  activeTabId: 'tab-1',
  tabs: [
    {
      id: 'tab-1',
      savedRequestRef: { collectionName: 'col', singleRequestName: 'req-a' },
      formSnapshot: null,
      activeHistoryRef: 'hist-9',
      title: 'req-a',
      order: 0,
    },
  ],
}

describe('createLocalStorageWorkspaceRepository', () => {
  it('round-trips a saved workspace', async () => {
    const repo = createLocalStorageWorkspaceRepository(fakeStorage())
    await repo.save(workspace)
    expect(await repo.load()).toEqual(workspace)
  })

  it('returns null when nothing is persisted', async () => {
    const repo = createLocalStorageWorkspaceRepository(fakeStorage())
    expect(await repo.load()).toBeNull()
  })

  it('returns null for corrupt JSON', async () => {
    const storage = fakeStorage()
    storage.setItem('devset.messageDispatch.workspace', '{not json')
    const repo = createLocalStorageWorkspaceRepository(storage)
    expect(await repo.load()).toBeNull()
  })

  it('returns null when the stored shape has no tabs array', async () => {
    const storage = fakeStorage()
    storage.setItem('devset.messageDispatch.workspace', JSON.stringify({ activeTabId: 'x' }))
    const repo = createLocalStorageWorkspaceRepository(storage)
    expect(await repo.load()).toBeNull()
  })

  it('returns null for a payload with no schema version (pre-versioning data)', async () => {
    const storage = fakeStorage()
    storage.setItem('devset.messageDispatch.workspace', JSON.stringify(workspace))
    const repo = createLocalStorageWorkspaceRepository(storage)
    expect(await repo.load()).toBeNull()
  })

  it('returns null for a payload with a mismatched schema version', async () => {
    const storage = fakeStorage()
    storage.setItem('devset.messageDispatch.workspace', JSON.stringify({ ...workspace, schemaVersion: 999 }))
    const repo = createLocalStorageWorkspaceRepository(storage)
    expect(await repo.load()).toBeNull()
  })

  it('swallows storage write failures', async () => {
    const throwing = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded')
      },
    }
    const repo = createLocalStorageWorkspaceRepository(throwing)
    await expect(repo.save(workspace)).resolves.toBeUndefined()
  })
})

// -- hybrid (saved -> api, scratch -> local) ----------------------------------

const memoryRepo = () => {
  let stored: PersistedWorkspace | null = null
  const repo: DispatchWorkspaceRepository = {
    load: () => Promise.resolve(stored),
    save: (workspace) => {
      stored = workspace
      return Promise.resolve()
    },
  }
  return { repo, get: () => stored }
}

const savedTab: DispatchTab = {
  id: 'saved',
  savedRequestRef: { collectionName: 'c', singleRequestName: 'r' },
  formSnapshot: null,
  activeHistoryRef: null,
  title: 'r',
  order: 1,
}

const scratchTab: DispatchTab = {
  id: 'scratch',
  savedRequestRef: null,
  formSnapshot: null,
  activeHistoryRef: null,
  title: 'Untitled',
  order: 0,
}

describe('createHybridWorkspaceRepository', () => {
  it('stores every tab locally and only saved-request pointers on the api', async () => {
    const local = memoryRepo()
    const api = memoryRepo()
    const hybrid = createHybridWorkspaceRepository(local.repo, api.repo)

    await hybrid.save({ activeTabId: 'saved', tabs: [scratchTab, savedTab] })

    expect(local.get()?.tabs.map((t) => t.id)).toEqual(['scratch', 'saved'])
    expect(api.get()?.tabs.map((t) => t.id)).toEqual(['saved'])
  })

  it('prefers local content over the server pointer for the same tab (preserves edits)', async () => {
    const local = memoryRepo()
    const api = memoryRepo()
    const editedMirror: DispatchTab = { ...savedTab, title: 'edited', order: 0 }
    const serverPointer: DispatchTab = { ...savedTab, title: 'original', order: 0 }
    await local.repo.save({ activeTabId: 'saved', tabs: [editedMirror] })
    await api.repo.save({ activeTabId: 'saved', tabs: [serverPointer] })
    const hybrid = createHybridWorkspaceRepository(local.repo, api.repo)

    const merged = await hybrid.load()

    expect(merged?.tabs).toHaveLength(1)
    expect(merged?.tabs[0].title).toBe('edited')
  })

  it('merges local scratch and server saved tabs by order on load', async () => {
    const local = memoryRepo()
    const api = memoryRepo()
    await local.repo.save({ activeTabId: 'scratch', tabs: [scratchTab] })
    await api.repo.save({ activeTabId: null, tabs: [savedTab] })
    const hybrid = createHybridWorkspaceRepository(local.repo, api.repo)

    const merged = await hybrid.load()

    expect(merged?.tabs.map((t) => t.id)).toEqual(['scratch', 'saved'])
    expect(merged?.tabs.map((t) => t.order)).toEqual([0, 1])
    expect(merged?.activeTabId).toBe('scratch')
  })

  it('returns null when both stores are empty', async () => {
    const hybrid = createHybridWorkspaceRepository(memoryRepo().repo, memoryRepo().repo)
    expect(await hybrid.load()).toBeNull()
  })

  it('still restores scratch tabs when the api load fails', async () => {
    const local = memoryRepo()
    await local.repo.save({ activeTabId: 'scratch', tabs: [scratchTab] })
    const failingApi: DispatchWorkspaceRepository = {
      load: () => Promise.reject(new Error('backend down')),
      save: () => Promise.resolve(),
    }
    const hybrid = createHybridWorkspaceRepository(local.repo, failingApi)

    const merged = await hybrid.load()

    expect(merged?.tabs.map((t) => t.id)).toEqual(['scratch'])
  })
})
