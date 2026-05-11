/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { describe, expect, it } from 'vitest'
import { createBootstrapFromPayload, parseDslPayloadFromJson } from './workflow-bootstrap.service'
import type { DslPayload } from '../types'

describe('createBootstrapFromPayload', () => {
  it('bootstraps a query-only stage (no event/set/headers in DSL)', () => {
    const payload: DslPayload = {
      id: 'test-wf',
      producerName: 'test',
      topic: 'test-topic',
      executions: 1,
      state: {},
      pipeline: [
        {
          stage: 'fetch-users',
          source: 'none',
          emit: false,
          query: {
            connection: 'mongo-1',
            database: 'mydb',
            collection: 'users',
            select: { 'state.name': 'name', 'state.age': 'age' },
          },
        },
      ],
    }

    const bootstrap = createBootstrapFromPayload(payload)

    expect(bootstrap.nodes).toHaveLength(1)
    expect(bootstrap.nodes[0].data.hasQuery).toBe(true)
    expect(bootstrap.nodes[0].data.event).toBe('')
    expect(bootstrap.nodes[0].data.stage).toBe('fetch-users')

    // Query overrides are reconstructed
    const qo = bootstrap.queryOverridesByNode?.[bootstrap.nodes[0].id]
    expect(qo).toBeDefined()
    expect(qo?.connection).toBe('mongo-1')
    expect(qo?.database).toBe('mydb')
    expect(qo?.collection).toBe('users')
    expect(qo?.select).toHaveLength(2)
    expect(qo?.select[0].field).toBe('name')
    expect(qo?.select[0].statePath).toBe('state.name')
  })

  it('bootstraps a standard stage with event/set/headers', () => {
    const payload: DslPayload = {
      id: 'test-wf',
      producerName: 'test',
      topic: 'test-topic',
      executions: 1,
      state: {},
      pipeline: [
        {
          stage: 'process',
          event: 'user.created',
          source: 'none',
          set: { name: 'John' },
          headers: { 'x-source': 'test' },
          emit: true,
        },
      ],
    }

    const bootstrap = createBootstrapFromPayload(payload)

    expect(bootstrap.nodes[0].data.event).toBe('user.created')
    expect(bootstrap.nodes[0].data.hasQuery).toBeUndefined()
    expect(bootstrap.setOverridesByNode?.[bootstrap.nodes[0].id]).toEqual({ name: 'John' })
    expect(bootstrap.headerOverridesByNode?.[bootstrap.nodes[0].id]).toEqual({ 'x-source': 'test' })
  })

  it('reconstructs query find entries from DSL', () => {
    const payload: DslPayload = {
      id: 'test-wf',
      producerName: 'test',
      topic: 'test-topic',
      executions: 1,
      state: {},
      pipeline: [
        {
          stage: 'fetch',
          source: 'none',
          emit: false,
          query: {
            connection: 'mongo-1',
            database: 'db',
            collection: 'col',
            find: { age: { $gt: 18 }, name: 'John' },
            select: { 'state.x': 'x' },
          },
        },
      ],
    }

    const bootstrap = createBootstrapFromPayload(payload)
    const qo = bootstrap.queryOverridesByNode?.[bootstrap.nodes[0].id]

    expect(qo?.find).toHaveLength(2)

    const ageFilter = qo?.find.find((f) => f.field === 'age')
    expect(ageFilter?.op).toBe('$gt')
    expect(ageFilter?.value).toEqual({ kind: 'literal', value: 18 })

    const nameFilter = qo?.find.find((f) => f.field === 'name')
    expect(nameFilter?.op).toBe('$eq')
    expect(nameFilter?.value).toEqual({ kind: 'literal', value: 'John' })
  })
})

describe('parseDslPayloadFromJson', () => {
  it('accepts query-only stages without emit validation', () => {
    const json = JSON.stringify({
      id: 'test',
      producerName: 'test',
      topic: 'topic',
      executions: 1,
      state: {},
      pipeline: [
        {
          stage: 'fetch',
          source: 'none',
          query: { connection: 'c', database: 'd', collection: 'col', select: { 'state.x': 'x' } },
        },
      ],
    })

    // Should not throw — query stages skip emit validation
    const payload = parseDslPayloadFromJson(json)
    expect(payload.pipeline).toHaveLength(1)
    expect(payload.pipeline[0].query).toBeDefined()
  })

  it('rejects non-query stages with invalid emit', () => {
    const json = JSON.stringify({
      id: 'test',
      producerName: 'test',
      topic: 'topic',
      executions: 1,
      state: {},
      pipeline: [
        { stage: 'process', source: 'none', event: 'e', set: {}, headers: {}, emit: 'invalid' },
      ],
    })

    expect(() => parseDslPayloadFromJson(json)).toThrow('emit')
  })
})
