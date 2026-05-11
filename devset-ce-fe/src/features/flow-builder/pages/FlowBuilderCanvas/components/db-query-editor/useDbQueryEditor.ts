/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useI18n } from '../../../../../../core/i18n/I18nProvider'
import {
  listDbConnectorConfigurations,
  type DbConnectorStatus,
} from '../../../../../../shared/services/db-connectors.service'
import {
  fetchMongoDatabases,
  fetchMongoCollections,
  fetchMongoSchema,
  type MongoFieldSchema,
} from '../../../../../../shared/services/mongodb-schema.service'
import { createClientId } from '../../../../../../shared/utils/create-client-id'
import type {
  QueryConfig,
  QueryFindEntry,
  QuerySelectEntry,
  WorkflowState,
} from '../../../../types'
import { EMPTY_QUERY, flattenSchemaFields } from './db-query.utils'

/** Encapsulates all local state and handlers for the DB query editor modal. */
export function useDbQueryEditor(
  isOpen: boolean,
  initialQuery: QueryConfig | null,
  workflowState: WorkflowState,
  onSave: (query: QueryConfig) => void,
  onRemove: () => void,
  onClose: () => void,
) {
  const { t } = useI18n()

  // ── Local state ──
  const [query, setQuery] = useState<QueryConfig>(() => initialQuery ?? { ...EMPTY_QUERY })
  const [connectors, setConnectors] = useState<DbConnectorStatus[]>([])
  const [databases, setDatabases] = useState<string[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [schemaFields, setSchemaFields] = useState<MongoFieldSchema[]>([])
  const [isLoadingSchema, setIsLoadingSchema] = useState(false)

  // Reset local state when modal opens; restore dropdowns for existing query.
  // `initialQuery` and `workflowState` are intentionally excluded from deps: we want a
  // one-shot snapshot at open time, not live re-sync while the user is editing.
  useEffect(() => {
    if (!isOpen) return
    const q = initialQuery ?? { ...EMPTY_QUERY }
    setQuery(q)
    setSchemaFields([])
    setDatabases([])
    setCollections([])

    let cancelled = false

    void (async () => {
      try {
        const result = await listDbConnectorConfigurations()
        if (cancelled) return
        setConnectors(result.filter((c) => c.type === 'mongodb'))
      } catch (error) {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : 'Failed to load connectors')
      }

      if (!q.connection) return
      try {
        const dbs = await fetchMongoDatabases(q.connection)
        if (cancelled) return
        setDatabases(dbs)
      } catch (error) {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : 'Failed to load databases')
      }

      if (!q.database) return
      try {
        const cols = await fetchMongoCollections(q.connection, q.database)
        if (cancelled) return
        setCollections(cols)
      } catch (error) {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : 'Failed to load collections')
      }

      if (!q.collection) return
      try {
        const fields = await fetchMongoSchema({
          connectionName: q.connection,
          database: q.database,
          collection: q.collection,
        })
        if (cancelled) return
        setSchemaFields(fields)
      } catch (error) {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : 'Failed to fetch schema')
      }
    })()

    return () => { cancelled = true }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ──
  const connectorNames = useMemo(() => connectors.map((c) => c.name), [connectors])
  const flatFields = useMemo(() => flattenSchemaFields(schemaFields), [schemaFields])
  const stateKeys = useMemo(() => Object.keys(workflowState).map((k) => `state.${k}`), [workflowState])

  // ── Handlers ──

  const handleFetchSchema = useCallback(async () => {
    if (!query.connection || !query.database || !query.collection) {
      toast.error(t('flow.query.selectSourceFirst'))
      return
    }
    setIsLoadingSchema(true)
    try {
      const fields = await fetchMongoSchema({
        connectionName: query.connection,
        database: query.database,
        collection: query.collection,
      })
      setSchemaFields(fields)
      // Auto-add all fields as select mappings only when there are none yet
      setQuery((prev) => {
        if (prev.select.length > 0) return prev
        const paths = flattenSchemaFields(fields)
        return {
          ...prev,
          select: paths.map((p) => ({
            id: createClientId(),
            field: p,
            statePath: `state.${p}`,
          })),
        }
      })
      toast.success(t('flow.query.schemaLoaded'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch schema')
    } finally {
      setIsLoadingSchema(false)
    }
  }, [query.connection, query.database, query.collection, t])

  const setQ = useCallback((patch: Partial<QueryConfig>) => {
    setQuery((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleConnectionChange = useCallback((connection: string) => {
    setQuery((prev) => ({ ...prev, connection, database: '', collection: '' }))
    setDatabases([])
    setCollections([])
    setSchemaFields([])
    if (!connection) return
    void (async () => {
      try {
        const dbs = await fetchMongoDatabases(connection)
        setDatabases(dbs)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load databases')
      }
    })()
  }, [])

  const handleDatabaseChange = useCallback((database: string) => {
    setQuery((prev) => ({ ...prev, database, collection: '' }))
    setCollections([])
    setSchemaFields([])
    if (!database || !query.connection) return
    void (async () => {
      try {
        const cols = await fetchMongoCollections(query.connection, database)
        setCollections(cols)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load collections')
      }
    })()
  }, [query.connection])

  const handleCollectionChange = useCallback((collection: string) => {
    setQ({ collection })
    setSchemaFields([])
  }, [setQ])

  const addFindEntry = useCallback(() => {
    const firstField = flatFields[0] ?? ''
    setQuery((prev) => ({
      ...prev,
      find: [...prev.find, { id: createClientId(), field: firstField, op: '$eq', value: { kind: 'literal', value: '' } }],
    }))
  }, [flatFields])

  const updateFindEntry = useCallback((id: string, patch: Partial<QueryFindEntry>) => {
    setQuery((prev) => ({
      ...prev,
      find: prev.find.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }))
  }, [])

  const removeFindEntry = useCallback((id: string) => {
    setQuery((prev) => ({ ...prev, find: prev.find.filter((f) => f.id !== id) }))
  }, [])

  const addSelectEntry = useCallback(() => {
    const firstField = flatFields[0] ?? ''
    setQuery((prev) => ({
      ...prev,
      select: [...prev.select, { id: createClientId(), statePath: `state.${firstField}`, field: firstField }],
    }))
  }, [flatFields])

  const updateSelectEntry = useCallback((id: string, patch: Partial<QuerySelectEntry>) => {
    setQuery((prev) => ({
      ...prev,
      select: prev.select.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }, [])

  const removeSelectEntry = useCallback((id: string) => {
    setQuery((prev) => ({ ...prev, select: prev.select.filter((s) => s.id !== id) }))
  }, [])

  const handleSave = useCallback(() => {
    if (query.select.length === 0) {
      toast.error(t('flow.query.needAtLeastOneMapping'))
      return
    }
    if (query.select.some((s) => !s.field.trim() || !s.statePath.trim())) {
      toast.error(t('flow.query.needAtLeastOneMapping'))
      return
    }
    onSave(query)
    onClose()
  }, [query, onSave, onClose, t])

  const handleRemoveQuery = useCallback(() => {
    onRemove()
    onClose()
  }, [onRemove, onClose])

  return {
    query,
    connectorNames,
    databases,
    collections,
    schemaFields,
    flatFields,
    stateKeys,
    isLoadingSchema,
    handleFetchSchema,
    handleConnectionChange,
    handleDatabaseChange,
    handleCollectionChange,
    addFindEntry,
    updateFindEntry,
    removeFindEntry,
    addSelectEntry,
    updateSelectEntry,
    removeSelectEntry,
    handleSave,
    handleRemoveQuery,
  }
}
