/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { fetchApi } from './http-api.service'

export type MongoFieldSchema = {
  path: string
  type: string
  children: MongoFieldSchema[]
}

export type FetchMongoSchemaRequest = {
  connectionName: string
  database: string
  collection: string
}

const isMongoFieldSchema = (value: unknown): value is MongoFieldSchema => {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return typeof obj.path === 'string'
    && typeof obj.type === 'string'
    && Array.isArray(obj.children)
    && obj.children.every(isMongoFieldSchema)
}

/** Fetches the schema (field list with types) for a MongoDB collection. */
export const fetchMongoSchema = async (request: FetchMongoSchemaRequest): Promise<MongoFieldSchema[]> => {
  const response = await fetchApi('/mongodb/schema', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      connectionName: request.connectionName,
      database: request.database,
      collection: request.collection,
    }),
  })
  const payload = (await response.json()) as unknown // SAFETY: cast to unknown for shape validation below
  if (!Array.isArray(payload) || !payload.every(isMongoFieldSchema)) {
    throw new Error('Invalid MongoDB schema response format')
  }
  return payload
}

/** Lists databases available on a MongoDB connection. */
export const fetchMongoDatabases = async (connectionName: string): Promise<string[]> => {
  const response = await fetchApi(`/mongodb/${encodeURIComponent(connectionName)}/databases`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  const payload = (await response.json()) as unknown // SAFETY: cast to unknown for shape validation below
  if (!Array.isArray(payload) || !payload.every((v) => typeof v === 'string')) {
    throw new Error('Invalid databases response format')
  }
  return payload
}

/** Lists collections in a MongoDB database. */
export const fetchMongoCollections = async (connectionName: string, database: string): Promise<string[]> => {
  const response = await fetchApi(
    `/mongodb/${encodeURIComponent(connectionName)}/${encodeURIComponent(database)}/collections`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    },
  )
  const payload = (await response.json()) as unknown // SAFETY: cast to unknown for shape validation below
  if (!Array.isArray(payload) || !payload.every((v) => typeof v === 'string')) {
    throw new Error('Invalid collections response format')
  }
  return payload
}
