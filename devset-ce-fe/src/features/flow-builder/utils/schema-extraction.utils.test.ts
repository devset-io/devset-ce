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
import { extractSchemaFieldTree, extractSchemaRootFields } from './schema-extraction.utils.ts'
import type { LoadedSchema } from '../types'

const PROTO_SOURCE = `
syntax = "proto3";

message Order {
  string id = 1;
  optional string note = 2;
  repeated string tags = 3 [deprecated = true];
  OrderLine line = 4;
  int64 total = 5;
}

message OrderLine {
  string sku = 1;
  int32 quantity = 2;
}
`

const protoSchema = (schema: string): LoadedSchema => ({
  id: 'schema-1',
  version: 1,
  event: 'order-created',
  fileName: 'order.proto',
  schemaType: 'protobuf',
  schema,
})

describe('schema-extraction protobuf parsing', () => {
  it('extracts root fields from a protobuf message', () => {
    const fields = extractSchemaRootFields(protoSchema(PROTO_SOURCE))
    expect(fields).toEqual(['id', 'note', 'tags', 'line', 'total'])
  })

  it('resolves nested message fields in the field tree', () => {
    const tree = extractSchemaFieldTree(protoSchema(PROTO_SOURCE))
    const line = tree.find((node) => node.label === 'line')
    expect(line).toBeDefined()
    expect(line?.children.map((child) => child.label)).toEqual(['sku', 'quantity'])
  })

  it('ignores indented and malformed field lines', () => {
    const fields = extractSchemaRootFields(
      protoSchema('message Broken {\n  this is not a field\n  string ok = 1;\n}'),
    )
    expect(fields).toEqual(['ok'])
  })

  it('returns no fields for empty schema input', () => {
    expect(extractSchemaRootFields(undefined)).toEqual([])
    expect(extractSchemaRootFields(protoSchema(''))).toEqual([])
  })
})
