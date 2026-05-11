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

export type DbConnectorType = 'mongodb' | 'postgres'

export type DbConnectorStatus = {
  type: DbConnectorType
  name: string
  connectionString: string
  database: string
  connected: boolean
  authenticated: boolean
}

export type CreateDbConnectorRequest = {
  type: DbConnectorType
  name: string
  connectionString: string
  database: string
  username: string | null
  password: string | null
}

const sanitizeDbConnectorStatus = (value: unknown): DbConnectorStatus | null => {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<DbConnectorStatus> // SAFETY: value is checked for object type above
  if (candidate.type !== 'mongodb' && candidate.type !== 'postgres') return null
  if (typeof candidate.name !== 'string' || !candidate.name.trim()) return null
  if (typeof candidate.connectionString !== 'string') return null
  return {
    type: candidate.type,
    name: candidate.name.trim(),
    connectionString: candidate.connectionString,
    database: typeof candidate.database === 'string' ? candidate.database : '',
    connected: candidate.connected === true,
    authenticated: candidate.authenticated === true,
  }
}

/** Lists all database connector configurations. */
export const listDbConnectorConfigurations = async (): Promise<DbConnectorStatus[]> => {
  const response = await fetchApi('/db/connectors/configurations', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  const payload = (await response.json()) as unknown // SAFETY: intentionally casting to unknown for Array.isArray validation
  if (!Array.isArray(payload)) {
    throw new Error('Invalid db connectors response format')
  }
  return payload
    .map(sanitizeDbConnectorStatus)
    .filter((c): c is DbConnectorStatus => c !== null)
}

/** Creates or updates a database connector configuration. */
export const createDbConnectorConfiguration = async (request: CreateDbConnectorRequest): Promise<void> => {
  if (!request.name.trim()) throw new Error('Connector name is required')
  if (!request.connectionString.trim()) throw new Error('Connection string is required')
  if (!request.database.trim()) throw new Error('Database name is required')

  await fetchApi('/db/connectors/configurations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      type: request.type,
      name: request.name.trim(),
      connectionString: request.connectionString.trim(),
      database: request.database.trim(),
      username: request.username,
      password: request.password,
    }),
  })
}

/** Deletes a database connector configuration. */
export const deleteDbConnectorConfiguration = async (type: DbConnectorType, name: string): Promise<void> => {
  const normalizedName = name.trim()
  if (!normalizedName) throw new Error('Connector name is required')

  await fetchApi(`/db/connectors/configurations/${type}/${encodeURIComponent(normalizedName)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })
}
