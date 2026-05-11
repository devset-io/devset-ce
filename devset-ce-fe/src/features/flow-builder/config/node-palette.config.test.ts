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
import { buildDslStageFromNode } from './node-palette.config'
import type { BuilderNode, QueryConfig } from '../types'

const makeNode = (overrides: Partial<BuilderNode['data']> = {}): BuilderNode => ({
  id: 'test-node',
  type: 'builder',
  position: { x: 0, y: 0 },
  data: {
    title: 'Test',
    stage: 'test-stage',
    event: 'test.event',
    source: 'none',
    emit: true,
    color: '#2f9e66',
    ...overrides,
  },
})

describe('buildDslStageFromNode', () => {
  it('builds a standard stage with event, set, headers', () => {
    const node = makeNode()
    const stage = buildDslStageFromNode(node, 0)

    expect(stage.stage).toBe('test-stage')
    expect(stage.event).toBe('test.event')
    expect(stage.source).toBe('none')
    expect(stage.set).toEqual({})
    expect(stage.headers).toEqual({})
    expect(stage.emit).toBe(true)
  })

  it('builds a query-only stage without event/set/headers', () => {
    const node = makeNode({ hasQuery: true, emit: false })
    const queryOverride: QueryConfig = {
      connection: 'mongo-1',
      database: 'mydb',
      collection: 'users',
      find: [],
      select: [{ id: 's1', statePath: 'state.name', field: 'name' }],
    }

    const stage = buildDslStageFromNode(node, 0, { queryOverride })

    expect(stage.stage).toBe('test-stage')
    expect(stage.source).toBe('none')
    expect(stage.emit).toBe(false)
    expect(stage.query).toBeDefined()
    expect(stage.query).toHaveProperty('connection', 'mongo-1')
    expect(stage.query).toHaveProperty('select')
    // Query-only stages omit event/set/headers
    expect(stage.event).toBeUndefined()
    expect(stage.set).toBeUndefined()
    expect(stage.headers).toBeUndefined()
  })

  it('skips query when select is empty', () => {
    const node = makeNode({ hasQuery: true })
    const emptyQuery: QueryConfig = {
      connection: 'mongo-1',
      database: 'mydb',
      collection: 'users',
      find: [],
      select: [],
    }

    const stage = buildDslStageFromNode(node, 0, { queryOverride: emptyQuery })

    // Falls through to standard stage because select is empty
    expect(stage.event).toBe('test.event')
    expect(stage.set).toBeDefined()
    expect(stage.query).toBeUndefined()
  })

  it('includes query on a standard stage when node does not have hasQuery flag', () => {
    const node = makeNode() // no hasQuery
    const queryOverride: QueryConfig = {
      connection: 'mongo-1',
      database: 'mydb',
      collection: 'users',
      find: [],
      select: [{ id: 's1', statePath: 'state.name', field: 'name' }],
    }

    const stage = buildDslStageFromNode(node, 0, { queryOverride })

    // Standard stage with query attached
    expect(stage.event).toBe('test.event')
    expect(stage.set).toBeDefined()
    expect(stage.query).toBeDefined()
  })

  it('compiles query find entries with operators', () => {
    const node = makeNode({ hasQuery: true, emit: false })
    const queryOverride: QueryConfig = {
      connection: 'mongo-1',
      database: 'mydb',
      collection: 'users',
      find: [
        { id: 'f1', field: 'age', op: '$gt', value: { kind: 'literal', value: 18 } },
        { id: 'f2', field: 'name', op: '$eq', value: { kind: 'literal', value: 'John' } },
      ],
      select: [{ id: 's1', statePath: 'state.name', field: 'name' }],
    }

    const stage = buildDslStageFromNode(node, 0, { queryOverride })
    const query = stage.query as Record<string, unknown>

    expect(query.find).toEqual({ age: { $gt: 18 }, name: 'John' })
  })

  it('compiles query select with path values', () => {
    const node = makeNode({ hasQuery: true, emit: false })
    const queryOverride: QueryConfig = {
      connection: 'mongo-1',
      database: 'mydb',
      collection: 'users',
      find: [],
      select: [
        { id: 's1', statePath: 'state.email', field: 'email' },
        { id: 's2', statePath: 'state.age', field: 'age', default: { kind: 'literal', value: 0 } },
      ],
    }

    const stage = buildDslStageFromNode(node, 0, { queryOverride })
    const query = stage.query as Record<string, unknown>

    expect(query.select).toEqual({
      'state.email': 'email',
      'state.age': { field: 'age', default: 0 },
    })
  })
})
