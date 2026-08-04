// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

vi.mock('../../../shared/services/http-api.service', () => ({
  fetchApi: vi.fn(),
}))

import { fetchApi } from '../../../shared/services/http-api.service'
import {
  createCollection,
  createSingleRequest,
  deleteCollectionByName,
  deleteSingleRequestByName,
  executeSingleStep,
  getCollectionByName,
  getCollections,
  getDispatchRunStatus,
  getSingleRequestByName,
  getSingleRequests,
  getSingleStepHistory,
  patchCollectionContext,
  patchSingleRequest,
  waitForDispatchCompletion,
  type SingleRequestPayload,
  type SingleStepExecuteRequest,
} from './message-dispatch.service'

const fetchApiMock = fetchApi as unknown as Mock

const jsonResponse = (body: unknown) => ({ json: () => Promise.resolve(body) })

beforeEach(() => {
  fetchApiMock.mockReset()
})

const baseExecuteRequest: SingleStepExecuteRequest = {
  producerName: 'producer-a',
  state: {},
  set: {},
}

// -- executeSingleStep / assertExecuteResponse --------------------------------

describe('executeSingleStep', () => {
  it('maps a well-formed response', async () => {
    fetchApiMock.mockResolvedValue(
      jsonResponse({
        historyId: 'h1',
        runId: 'r1',
        status: 'RUNNING',
        executions: 3,
        workflowId: 'wf-1',
        contentType: 'application/x-protobuf',
        schemaId: 'schema-1',
        protoSchema: 'proto',
        protobufRootMessage: 'Root',
      }),
    )

    const result = await executeSingleStep(baseExecuteRequest)

    expect(result).toEqual({
      historyId: 'h1',
      runId: 'r1',
      status: 'RUNNING',
      executions: 3,
      workflowId: 'wf-1',
      contentType: 'application/x-protobuf',
      schemaId: 'schema-1',
      protoSchema: 'proto',
      protobufRootMessage: 'Root',
    })
    expect(fetchApiMock).toHaveBeenCalledWith(
      '/single-step/execute',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('defaults executions to 1 and contentType to application/json when absent/invalid', async () => {
    fetchApiMock.mockResolvedValue(
      jsonResponse({ historyId: 'h1', runId: 'r1', status: 'PENDING', executions: -5 }),
    )

    const result = await executeSingleStep(baseExecuteRequest)

    expect(result.executions).toBe(1)
    expect(result.contentType).toBe('application/json')
    expect(result.workflowId).toBeNull()
    expect(result.schemaId).toBeNull()
  })

  it('throws when payload is not an object', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse(null))
    await expect(executeSingleStep(baseExecuteRequest)).rejects.toThrow()
  })

  it('throws when historyId is missing', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ runId: 'r1', status: 'PENDING' }))
    await expect(executeSingleStep(baseExecuteRequest)).rejects.toThrow()
  })

  it('throws when runId is missing', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ historyId: 'h1', status: 'PENDING' }))
    await expect(executeSingleStep(baseExecuteRequest)).rejects.toThrow()
  })

  it('throws when status is missing', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ historyId: 'h1', runId: 'r1' }))
    await expect(executeSingleStep(baseExecuteRequest)).rejects.toThrow()
  })
})

// -- getSingleStepHistory / toHistoryEntry / wire format resolution -----------

describe('getSingleStepHistory', () => {
  const validEntry = {
    id: 'e1',
    runId: 'r1',
    workflowId: 'wf-1',
    producerName: 'producer-a',
    stage: 'stage-1',
    event: 'event-1',
    messageType: 'kafka',
  }

  it('maps valid entries and fills in defaults', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse([validEntry]))

    const [entry] = await getSingleStepHistory()

    expect(entry).toMatchObject({
      id: 'e1',
      runId: 'r1',
      workflowId: 'wf-1',
      messageType: 'kafka',
      contentType: 'application/json',
      producerName: 'producer-a',
      executions: 1,
      state: {},
      headers: {},
      workflowState: {},
    })
  })

  it('drops entries missing required fields', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse([validEntry, { id: 'incomplete' }]))
    const result = await getSingleStepHistory()
    expect(result).toHaveLength(1)
  })

  it('drops entries with an unknown messageType', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse([{ ...validEntry, messageType: 'sqs' }]))
    expect(await getSingleStepHistory()).toEqual([])
  })

  it('recognises rabbit messageType', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse([{ ...validEntry, messageType: 'rabbit' }]))
    const [entry] = await getSingleStepHistory()
    expect(entry.messageType).toBe('rabbit')
  })

  it('throws when the response is not an array', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ notAnArray: true }))
    await expect(getSingleStepHistory()).rejects.toThrow()
  })

  it('prefers a top-level wireFormat over state/pipeline', async () => {
    fetchApiMock.mockResolvedValue(
      jsonResponse([
        {
          ...validEntry,
          wireFormat: { type: 'binary-prefix', prefix: { size: 2, source: 'messageType' } },
          state: { wireFormat: { type: 'binary-prefix', prefix: { size: 2, source: 'messagePrefix', value: 1 } } },
        },
      ]),
    )
    const [entry] = await getSingleStepHistory()
    expect(entry.wireFormat).toEqual({ type: 'binary-prefix', prefix: { size: 2, source: 'messageType' } })
  })

  it('falls back to state.wireFormat when top-level is absent', async () => {
    fetchApiMock.mockResolvedValue(
      jsonResponse([
        {
          ...validEntry,
          state: { wireFormat: { type: 'binary-prefix', prefix: { size: 2, source: 'messagePrefix', value: 7 } } },
        },
      ]),
    )
    const [entry] = await getSingleStepHistory()
    expect(entry.wireFormat).toEqual({
      type: 'binary-prefix',
      prefix: { size: 2, source: 'messagePrefix', value: 7 },
    })
  })

  it('falls back to pipeline[0].wireFormat when top-level and state are absent', async () => {
    fetchApiMock.mockResolvedValue(
      jsonResponse([
        {
          ...validEntry,
          pipeline: [{ wireFormat: { type: 'binary-prefix', prefix: { size: 2, source: 'messageType' } } }],
        },
      ]),
    )
    const [entry] = await getSingleStepHistory()
    expect(entry.wireFormat).toEqual({ type: 'binary-prefix', prefix: { size: 2, source: 'messageType' } })
  })

  it('leaves wireFormat undefined when no source resolves', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse([validEntry]))
    const [entry] = await getSingleStepHistory()
    expect(entry.wireFormat).toBeUndefined()
  })

  it('rejects a wireFormat with the wrong type discriminator', async () => {
    fetchApiMock.mockResolvedValue(
      jsonResponse([{ ...validEntry, wireFormat: { type: 'other', prefix: { size: 2, source: 'messageType' } } }]),
    )
    const [entry] = await getSingleStepHistory()
    expect(entry.wireFormat).toBeUndefined()
  })

  it('rejects a wireFormat prefix with the wrong size', async () => {
    fetchApiMock.mockResolvedValue(
      jsonResponse([{ ...validEntry, wireFormat: { type: 'binary-prefix', prefix: { size: 4, source: 'messageType' } } }]),
    )
    const [entry] = await getSingleStepHistory()
    expect(entry.wireFormat).toBeUndefined()
  })

  it('rejects a wireFormat prefix with an unknown source', async () => {
    fetchApiMock.mockResolvedValue(
      jsonResponse([{ ...validEntry, wireFormat: { type: 'binary-prefix', prefix: { size: 2, source: 'bogus' } } }]),
    )
    const [entry] = await getSingleStepHistory()
    expect(entry.wireFormat).toBeUndefined()
  })

  it('rejects a messagePrefix value outside the uint16 range', async () => {
    fetchApiMock.mockResolvedValue(
      jsonResponse([
        { ...validEntry, wireFormat: { type: 'binary-prefix', prefix: { size: 2, source: 'messagePrefix', value: 70000 } } },
      ]),
    )
    const [entry] = await getSingleStepHistory()
    expect(entry.wireFormat).toBeUndefined()
  })

  it('rejects a non-numeric messagePrefix value', async () => {
    fetchApiMock.mockResolvedValue(
      jsonResponse([
        { ...validEntry, wireFormat: { type: 'binary-prefix', prefix: { size: 2, source: 'messagePrefix', value: 'nope' } } },
      ]),
    )
    const [entry] = await getSingleStepHistory()
    expect(entry.wireFormat).toBeUndefined()
  })

  it('floors a fractional messagePrefix value', async () => {
    fetchApiMock.mockResolvedValue(
      jsonResponse([
        { ...validEntry, wireFormat: { type: 'binary-prefix', prefix: { size: 2, source: 'messagePrefix', value: 4.9 } } },
      ]),
    )
    const [entry] = await getSingleStepHistory()
    expect(entry.wireFormat).toEqual({
      type: 'binary-prefix',
      prefix: { size: 2, source: 'messagePrefix', value: 4 },
    })
  })
})

// -- getDispatchRunStatus / assertRunStatus ------------------------------------

describe('getDispatchRunStatus', () => {
  it('maps a well-formed response and normalizes the status', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ runId: 'r1', status: 'running', failedExecutions: 2, errorMessage: 'boom' }))
    const result = await getDispatchRunStatus('r1')
    expect(result).toEqual({ runId: 'r1', status: 'RUNNING', failedExecutions: 2, errorMessage: 'boom' })
    expect(fetchApiMock).toHaveBeenCalledWith('/engine/runs/r1', expect.objectContaining({ method: 'GET' }))
  })

  it('defaults failedExecutions and errorMessage when absent', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ runId: 'r1', status: 'COMPLETED' }))
    const result = await getDispatchRunStatus('r1')
    expect(result.failedExecutions).toBe(0)
    expect(result.errorMessage).toBeNull()
  })

  it('throws when payload is not an object', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse('nope'))
    await expect(getDispatchRunStatus('r1')).rejects.toThrow()
  })

  it('throws when runId is missing', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ status: 'RUNNING' }))
    await expect(getDispatchRunStatus('r1')).rejects.toThrow()
  })

  it('throws when status is missing', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ runId: 'r1' }))
    await expect(getDispatchRunStatus('r1')).rejects.toThrow()
  })

  it('encodes the runId in the URL', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ runId: 'r/1', status: 'PENDING' }))
    await getDispatchRunStatus('r/1')
    expect(fetchApiMock).toHaveBeenCalledWith('/engine/runs/r%2F1', expect.anything())
  })
})

// -- waitForDispatchCompletion --------------------------------------------------

describe('waitForDispatchCompletion', () => {
  it('returns immediately when the first status is terminal', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ runId: 'r1', status: 'COMPLETED' }))
    const result = await waitForDispatchCompletion('r1', 5, 1)
    expect(result?.status).toBe('COMPLETED')
    expect(fetchApiMock).toHaveBeenCalledTimes(1)
  })

  it('polls until a terminal status is reached', async () => {
    fetchApiMock
      .mockResolvedValueOnce(jsonResponse({ runId: 'r1', status: 'RUNNING' }))
      .mockResolvedValueOnce(jsonResponse({ runId: 'r1', status: 'RUNNING' }))
      .mockResolvedValueOnce(jsonResponse({ runId: 'r1', status: 'FAILED' }))

    const result = await waitForDispatchCompletion('r1', 5, 1)

    expect(result?.status).toBe('FAILED')
    expect(fetchApiMock).toHaveBeenCalledTimes(3)
  })

  it('returns the last status after exhausting maxAttempts without a terminal state', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ runId: 'r1', status: 'RUNNING' }))
    const result = await waitForDispatchCompletion('r1', 2, 1)
    expect(result?.status).toBe('RUNNING')
    expect(fetchApiMock).toHaveBeenCalledTimes(2)
  })
})

// -- collections ----------------------------------------------------------------

describe('createCollection', () => {
  it('sends the collectionName and context and maps the response', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ collectionName: 'orders', collectionContext: { a: 1 } }))
    const result = await createCollection('orders', { a: 1 })
    expect(result).toEqual({ collectionName: 'orders', collectionContext: { a: 1 } })
    const [path, options] = fetchApiMock.mock.calls[0]
    expect(path).toBe('/collection')
    expect(JSON.parse(options.body)).toEqual({ collectionName: 'orders', collectionContext: { a: 1 } })
  })

  it('falls back to the request input when the response body is unusable', async () => {
    fetchApiMock.mockResolvedValue({ json: () => Promise.reject(new Error('bad json')) })
    const result = await createCollection('orders')
    expect(result).toEqual({ collectionName: 'orders', collectionContext: {} })
  })
})

describe('patchCollectionContext', () => {
  it('sends a PATCH with the new context and maps the response', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ collectionName: 'orders', collectionContext: { b: 2 } }))
    const result = await patchCollectionContext('orders', { b: 2 })
    expect(result.collectionContext).toEqual({ b: 2 })
    const [path, options] = fetchApiMock.mock.calls[0]
    expect(path).toBe('/collection/orders')
    expect(options.method).toBe('PATCH')
  })

  it('falls back to the request input when the response body is unusable', async () => {
    fetchApiMock.mockResolvedValue({ json: () => Promise.reject(new Error('bad json')) })
    const result = await patchCollectionContext('orders', { b: 2 })
    expect(result).toEqual({ collectionName: 'orders', collectionContext: { b: 2 } })
  })
})

describe('getCollections', () => {
  it('maps a bare array response', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse(['orders', { collectionName: 'events', collectionContext: {} }]))
    const result = await getCollections()
    expect(result).toEqual([
      { collectionName: 'orders', collectionContext: {} },
      { collectionName: 'events', collectionContext: {} },
    ])
  })

  it('maps a wrapped {collections} response', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ collections: [{ collectionName: 'orders', collectionContext: {} }] }))
    const result = await getCollections()
    expect(result).toEqual([{ collectionName: 'orders', collectionContext: {} }])
  })

  it('returns an empty list for an unrecognised shape', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ nope: true }))
    expect(await getCollections()).toEqual([])
  })

  it('drops entries without a usable name', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse([{ collectionContext: {} }, 'orders']))
    expect(await getCollections()).toEqual([{ collectionName: 'orders', collectionContext: {} }])
  })
})

describe('getCollectionByName', () => {
  it('combines the collection summary with its single requests', async () => {
    fetchApiMock.mockResolvedValue(
      jsonResponse({
        collectionName: 'orders',
        collectionContext: {},
        singleRequests: [
          {
            singleRequestName: 'req-a',
            collectionName: 'orders',
            producerName: 'p1',
            messageType: 'kafka',
          },
        ],
      }),
    )

    const { collection, singleRequests } = await getCollectionByName('orders')

    expect(collection.collectionName).toBe('orders')
    expect(singleRequests).toHaveLength(1)
    expect(singleRequests[0].singleRequestName).toBe('req-a')
  })

  it('falls back to an empty collection when the body is unusable', async () => {
    fetchApiMock.mockResolvedValue({ json: () => Promise.reject(new Error('bad json')) })
    const { collection, singleRequests } = await getCollectionByName('orders')
    expect(collection).toEqual({ collectionName: 'orders', collectionContext: {} })
    expect(singleRequests).toEqual([])
  })

  it('reads single requests from a bare array body', async () => {
    fetchApiMock.mockResolvedValue(
      jsonResponse([{ singleRequestName: 'req-a', collectionName: 'orders', producerName: 'p1', messageType: 'kafka' }]),
    )
    const { singleRequests } = await getCollectionByName('orders')
    expect(singleRequests).toHaveLength(1)
  })
})

describe('deleteCollectionByName', () => {
  it('sends a DELETE for the encoded collection name', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({}))
    await deleteCollectionByName('orders/2026')
    expect(fetchApiMock).toHaveBeenCalledWith('/collection/orders%2F2026', expect.objectContaining({ method: 'DELETE' }))
  })
})

// -- single requests --------------------------------------------------------------

const singleRequestPayload: SingleRequestPayload = {
  singleRequestName: 'req-a',
  collectionName: 'orders',
  messageType: 'kafka',
  contentType: 'application/json',
  producerName: 'p1',
  topic: 'orders-topic',
  exchange: null,
  routingKey: null,
  executions: 1,
  stage: null,
  event: null,
  state: {},
  key: null,
  headers: {},
  wireFormat: { type: 'none' },
  workflowState: {},
  protoSchema: null,
}

describe('createSingleRequest', () => {
  it('maps a well-formed response', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse(singleRequestPayload))
    const result = await createSingleRequest(singleRequestPayload)
    expect(result.singleRequestName).toBe('req-a')
    expect(fetchApiMock).toHaveBeenCalledWith('/single-requests', expect.objectContaining({ method: 'POST' }))
  })

  it('falls back to the request payload when the response body is unusable', async () => {
    fetchApiMock.mockResolvedValue({ json: () => Promise.reject(new Error('bad json')) })
    const result = await createSingleRequest(singleRequestPayload)
    expect(result).toBe(singleRequestPayload)
  })

  it('coerces a protobuf content type and DSL object key, dropping invalid entries', async () => {
    fetchApiMock.mockResolvedValue(
      jsonResponse({
        ...singleRequestPayload,
        contentType: 'application/x-protobuf',
        key: { kind: 'ref', value: 'orderId' },
      }),
    )
    const result = await createSingleRequest(singleRequestPayload)
    expect(result.contentType).toBe('application/x-protobuf')
    expect(result.key).toEqual({ kind: 'ref', value: 'orderId' })
  })

  it('accepts a string literal key', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ ...singleRequestPayload, key: 'literal-key' }))
    const result = await createSingleRequest(singleRequestPayload)
    expect(result.key).toBe('literal-key')
  })
})

describe('getSingleRequests', () => {
  it('reads from a bare array body', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse([singleRequestPayload]))
    expect(await getSingleRequests()).toEqual([singleRequestPayload])
  })

  it('reads from a wrapped {singleRequests} body', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ singleRequests: [singleRequestPayload] }))
    expect(await getSingleRequests()).toEqual([singleRequestPayload])
  })

  it('drops entries missing required fields', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse([singleRequestPayload, { singleRequestName: 'incomplete' }]))
    expect(await getSingleRequests()).toHaveLength(1)
  })

  it('drops entries with an unknown messageType', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse([{ ...singleRequestPayload, messageType: 'sqs' }]))
    expect(await getSingleRequests()).toEqual([])
  })
})

describe('getSingleRequestByName', () => {
  it('maps a well-formed response', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse(singleRequestPayload))
    const result = await getSingleRequestByName('req-a')
    expect(result?.singleRequestName).toBe('req-a')
    expect(fetchApiMock).toHaveBeenCalledWith('/single-requests/req-a', expect.objectContaining({ method: 'GET' }))
  })

  it('returns null when the response body is unusable', async () => {
    fetchApiMock.mockResolvedValue({ json: () => Promise.reject(new Error('bad json')) })
    expect(await getSingleRequestByName('req-a')).toBeNull()
  })

  it('falls back to name field when singleRequestName is absent', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({ ...singleRequestPayload, singleRequestName: undefined, name: 'req-b' }))
    const result = await getSingleRequestByName('req-b')
    expect(result?.singleRequestName).toBe('req-b')
  })
})

describe('patchSingleRequest', () => {
  it('sends a PATCH and maps the response', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse(singleRequestPayload))
    const result = await patchSingleRequest('req-a', singleRequestPayload)
    expect(result.singleRequestName).toBe('req-a')
    const [path, options] = fetchApiMock.mock.calls[0]
    expect(path).toBe('/single-requests/req-a')
    expect(options.method).toBe('PATCH')
  })

  it('falls back to the request payload when the response body is unusable', async () => {
    fetchApiMock.mockResolvedValue({ json: () => Promise.reject(new Error('bad json')) })
    const result = await patchSingleRequest('req-a', singleRequestPayload)
    expect(result).toBe(singleRequestPayload)
  })
})

describe('deleteSingleRequestByName', () => {
  it('sends a DELETE for the encoded name', async () => {
    fetchApiMock.mockResolvedValue(jsonResponse({}))
    await deleteSingleRequestByName('req a')
    expect(fetchApiMock).toHaveBeenCalledWith('/single-requests/req%20a', expect.objectContaining({ method: 'DELETE' }))
  })
})
