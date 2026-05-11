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

export type ConnectorType = 'kafka' | 'rabbit'

export type OpenKafkaConnectionRequest = {
  type: 'kafka'
  name: string
  bootstrapServers: string
  username: string | null
  password: string | null
}

export type OpenRabbitConnectionRequest = {
  type: 'rabbit'
  name: string
  host: string
  port: number
  virtualHost: string
  username: string | null
  password: string | null
}

export type OpenConnectorConfigurationRequest = OpenKafkaConnectionRequest | OpenRabbitConnectionRequest

export type ConnectorStatus = {
  type: ConnectorType
  name: string
  endpoint: string
  producerConnected: boolean
  consumerConnected: boolean
  authenticated: boolean
}

type ConnectorsState = {
  connectors: ConnectorStatus[]
  activeConnectorName: string | null
}

const CONNECTOR_CHANGED_EVENT = 'devset-connectors-changed'
let runtimeActiveConnectorName: string | null = null
let inFlightConnectorConfigurationsPromise: Promise<ConnectorStatus[]> | null = null

export type ConnectorsChangeEvent = {
  type: 'active_connector_changed' | 'configurations_changed'
  activeConnectorName: string | null
}

const toNullableText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const next = value.trim()
  return next.length > 0 ? next : null
}

const sanitizeConnectionStatus = (value: unknown): ConnectorStatus | null => {
  if (!value || typeof value !== 'object') {
    return null
  }
  const candidate = value as Partial<ConnectorStatus> // SAFETY: value is checked for object type above, Partial allows safe field access below
  if (candidate.type !== 'kafka' && candidate.type !== 'rabbit') {
    return null
  }
  if (typeof candidate.name !== 'string' || !candidate.name.trim()) {
    return null
  }
  if (typeof candidate.endpoint !== 'string' || !candidate.endpoint.trim()) {
    return null
  }
  return {
    type: candidate.type,
    name: candidate.name.trim(),
    endpoint: candidate.endpoint.trim(),
    producerConnected: candidate.producerConnected === true,
    consumerConnected: candidate.consumerConnected === true,
    authenticated: candidate.authenticated === true,
  }
}

const normalizeVirtualHost = (value: string): string => {
  const normalized = value.trim()
  if (!normalized || normalized === '/') {
    return '/'
  }

  try {
    const decoded = decodeURIComponent(normalized)
    if (!decoded || decoded === '/') {
      return '/'
    }
    return decoded.startsWith('/') ? decoded : `/${decoded}`
  } catch {
    // Intentional: decodeURIComponent failed on malformed encoding — use normalized path as-is
    return normalized.startsWith('/') ? normalized : `/${normalized}`
  }
}

const parseRabbitEndpoint = (
  endpoint: string,
): {
  host: string
  port: number
  virtualHost: string
} | null => {
  const trimmed = endpoint.trim()
  if (!trimmed) {
    return null
  }

  try {
    const url = new URL(trimmed)
    if (url.hostname) {
      const parsedPort = Number(url.port)
      return {
        host: url.hostname,
        port: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 5672,
        virtualHost: normalizeVirtualHost(url.pathname),
      }
    }
  } catch {
    // Intentional: URL constructor failed — fallback below handles non-URL values like host:port/vhost
  }

  const match = trimmed.match(/^(?:[^@/]+@)?([^:/?#]+)(?::(\d+))?(?:\/([^?#]*))?$/)
  if (!match) {
    return null
  }

  const [, host, portRaw, virtualHostRaw = ''] = match
  if (!host) {
    return null
  }

  const parsedPort = portRaw ? Number(portRaw) : 5672
  return {
    host,
    port: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 5672,
    virtualHost: normalizeVirtualHost(virtualHostRaw),
  }
}

export type EditableConnectorConfiguration = {
  configuration: OpenConnectorConfigurationRequest
  requiresAttention: boolean
  requiresCredentials: boolean
}

const emitConnectorsChange = (change: ConnectorsChangeEvent): void => {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(new CustomEvent<ConnectorsChangeEvent>(CONNECTOR_CHANGED_EVENT, { detail: change }))
}

export const getEditableConnectorConfiguration = (connector: ConnectorStatus): EditableConnectorConfiguration => {
  if (connector.type === 'kafka') {
    return {
      configuration: {
        type: 'kafka',
        name: connector.name,
        bootstrapServers: connector.endpoint,
        username: null,
        password: null,
      },
      requiresAttention: connector.authenticated,
      requiresCredentials: connector.authenticated,
    }
  }

  const parsedEndpoint = parseRabbitEndpoint(connector.endpoint)
  return {
    configuration: {
      type: 'rabbit',
      name: connector.name,
      host: parsedEndpoint?.host ?? '',
      port: parsedEndpoint?.port ?? 5672,
      virtualHost: parsedEndpoint?.virtualHost ?? '/',
      username: null,
      password: null,
    },
    requiresAttention: connector.authenticated || parsedEndpoint === null,
    requiresCredentials: connector.authenticated,
  }
}

export const subscribeConnectorsChanges = (onChange: (change: ConnectorsChangeEvent) => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {}
  }
  const handler = (event: Event) => {
    const nextEvent = event as CustomEvent<ConnectorsChangeEvent | undefined> // SAFETY: custom event dispatched via new CustomEvent with this detail type
    onChange(
      nextEvent.detail ?? {
        type: 'configurations_changed',
        activeConnectorName: runtimeActiveConnectorName,
      },
    )
  }
  window.addEventListener(CONNECTOR_CHANGED_EVENT, handler as EventListener) // SAFETY: DOM API requires EventListener; handler signature matches
  return () => {
    window.removeEventListener(CONNECTOR_CHANGED_EVENT, handler as EventListener) // SAFETY: DOM API requires EventListener; handler signature matches
  }
}

export const setActiveConnector = (name: string): void => {
  const normalized = name.trim()
  if (!normalized) {
    return
  }
  if (runtimeActiveConnectorName === normalized) {
    return
  }
  runtimeActiveConnectorName = normalized
  emitConnectorsChange({
    type: 'active_connector_changed',
    activeConnectorName: runtimeActiveConnectorName,
  })
}

export const listConnectorConfigurations = async (): Promise<ConnectorStatus[]> => {
  if (inFlightConnectorConfigurationsPromise) {
    return inFlightConnectorConfigurationsPromise
  }

  inFlightConnectorConfigurationsPromise = (async () => {
    const response = await fetchApi('/connectors/configurations', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    const payload = (await response.json()) as unknown // SAFETY: intentionally casting to unknown for subsequent Array.isArray validation
    if (!Array.isArray(payload)) {
      throw new Error('Invalid connectors response format')
    }

    return payload
      .map(sanitizeConnectionStatus)
      .filter((connector): connector is ConnectorStatus => connector !== null)
  })()

  try {
    return await inFlightConnectorConfigurationsPromise
  } finally {
    inFlightConnectorConfigurationsPromise = null
  }
}

export const loadConnectorsState = async (): Promise<ConnectorsState> => {
  const connectors = await listConnectorConfigurations()
  const activeConnectorName =
    runtimeActiveConnectorName && connectors.some((connector) => connector.name === runtimeActiveConnectorName)
      ? runtimeActiveConnectorName
      : connectors[0]?.name ?? null

  runtimeActiveConnectorName = activeConnectorName

  return {
    connectors,
    activeConnectorName,
  }
}

export const createConnectorConfiguration = async (draft: OpenConnectorConfigurationRequest): Promise<void> => {
  const common = {
    name: draft.name.trim(),
    username: toNullableText(draft.username),
    password: toNullableText(draft.password),
  }

  const payload: OpenConnectorConfigurationRequest =
    draft.type === 'rabbit'
      ? {
          type: 'rabbit',
          ...common,
          host: draft.host.trim(),
          port: Math.floor(draft.port),
          virtualHost: draft.virtualHost.trim(),
          username: common.username,
          password: common.password,
        }
      : {
          type: 'kafka',
          ...common,
          bootstrapServers: draft.bootstrapServers.trim(),
        }

  if (payload.type === 'kafka') {
    if (!payload.name || !payload.bootstrapServers) {
      throw new Error('Connector name and bootstrap servers are required')
    }
  } else {
    if (!payload.name || !payload.host || !Number.isFinite(payload.port) || payload.port < 1 || !payload.virtualHost) {
      throw new Error('Connector name, host, port and virtual host are required')
    }
  }

  await fetchApi('/connectors/configurations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  runtimeActiveConnectorName = payload.name
  emitConnectorsChange({
    type: 'configurations_changed',
    activeConnectorName: runtimeActiveConnectorName,
  })
}

export const deleteConnectorConfiguration = async (type: ConnectorType, name: string): Promise<void> => {
  const normalizedType: ConnectorType = type === 'rabbit' ? 'rabbit' : 'kafka'
  const normalizedName = name.trim()
  if (!normalizedName) {
    throw new Error('Connector name is required')
  }

  await fetchApi(`/connectors/configurations/${normalizedType}/${encodeURIComponent(normalizedName)}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  })

  if (runtimeActiveConnectorName === normalizedName) {
    runtimeActiveConnectorName = null
  }

  emitConnectorsChange({
    type: 'configurations_changed',
    activeConnectorName: runtimeActiveConnectorName,
  })
}

/** Fetches topic names for a given Kafka connector. */
export const fetchTopicsForConnector = async (connectionName: string, signal?: AbortSignal): Promise<string[]> => {
  const response = await fetchApi(
    `/kafka/topics?connectionName=${encodeURIComponent(connectionName)}`,
    { method: 'GET', headers: { Accept: 'application/json' }, signal },
  )
  const payload = (await response.json()) as unknown
  if (!Array.isArray(payload)) {
    throw new Error('Invalid topics response format')
  }
  return payload.filter((item): item is string => typeof item === 'string')
}

export type RabbitBrokerResources = {
  queues: string[]
  exchanges: string[]
}

/** Fetches broker resources (queues, exchanges) for a given RabbitMQ connector. */
export const fetchRabbitBrokerResources = async (
  connectionName: string,
  signal?: AbortSignal,
): Promise<RabbitBrokerResources> => {
  const response = await fetchApi(
    `/rabbit/broker-resources?connectionName=${encodeURIComponent(connectionName)}`,
    { method: 'GET', headers: { Accept: 'application/json' }, signal },
  )
  const payload = (await response.json()) as Record<string, unknown> // SAFETY: intentionally casting for subsequent field validation
  const queues = Array.isArray(payload.queues)
    ? payload.queues.filter((item): item is string => typeof item === 'string')
    : []
  const exchanges = Array.isArray(payload.exchanges)
    ? payload.exchanges.filter((item): item is string => typeof item === 'string')
    : []
  return { queues, exchanges }
}

/** Callbacks for dispatching connector suggestion results. */
export type ConnectorSuggestionsCallbacks = {
  onTopics: (connectorName: string, topics: string[]) => void
  onRabbitResources: (connectorName: string, queues: string[], exchanges: string[]) => void
}

/** Fetches topic suggestions (Kafka) or broker resources (RabbitMQ) for a connector. Best-effort — failures are logged but not surfaced. */
export async function loadConnectorSuggestions(
  connector: ConnectorStatus,
  signal: AbortSignal,
  callbacks: ConnectorSuggestionsCallbacks,
): Promise<void> {
  if (connector.type === 'rabbit') {
    try {
      const resources = await fetchRabbitBrokerResources(connector.name, signal)
      if (!signal.aborted) {
        callbacks.onRabbitResources(connector.name, resources.queues, resources.exchanges)
      }
    } catch (error) {
      if (!signal.aborted) {
        console.warn('Failed to load rabbit broker resources for', connector.name, error)
      }
    }
    return
  }

  if (connector.type !== 'kafka') return
  try {
    const topics = await fetchTopicsForConnector(connector.name, signal)
    if (!signal.aborted) {
      callbacks.onTopics(connector.name, topics)
    }
  } catch (error) {
    if (!signal.aborted) {
      console.warn('Failed to load topic suggestions for', connector.name, error)
    }
  }
}

// Backward-compatible aliases used across existing FE modules.
export const subscribeKafkaConnectorsChanges = subscribeConnectorsChanges
export const setActiveKafkaConnector = setActiveConnector
export const listKafkaConnections = listConnectorConfigurations
export const loadKafkaConnectorsState = loadConnectorsState
export const openKafkaConnection = createConnectorConfiguration
