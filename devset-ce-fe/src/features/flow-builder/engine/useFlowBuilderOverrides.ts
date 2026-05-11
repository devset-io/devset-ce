/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useState } from 'react'
import type { FlowBuilderBootstrap, FnOverrides, QueryConfig, RepeatOverrides, StageWireFormat } from '../types'

// ──────────────────────────────────────────────────────────────
// useFlowBuilderOverrides
//
// Domain hook that manages per-node override maps.
//
// Each pipeline step (node) can have user-customized values that
// override what the schema provides by default. There are 7
// independent override categories:
//
//   fnOverrides      – function call overrides (e.g. $fn expressions)
//   setOverrides     – field value overrides in the "set" block
//   headerOverrides  – custom HTTP/Kafka headers
//   waitOverrides    – wait duration before step execution
//   wireFormatOverrides – binary serialization config (protobuf)
//   stateOverrides   – workflow state mutation mappings
//   repeatOverrides  – repeat/loop configuration
//
// All maps are keyed by node ID, so each node has its own
// independent set of overrides.
//
// This hook only stores the raw override data. The logic that
// interprets or applies these overrides lives in the composition
// hook (useFlowBuilderState).
// ──────────────────────────────────────────────────────────────

// Only pick the override-related fields from bootstrap for initialization.
type OverridesInit = Pick<
  FlowBuilderBootstrap,
  | 'setOverridesByNode'
  | 'headerOverridesByNode'
  | 'waitOverridesByNode'
  | 'wireFormatOverridesByNode'
  | 'stateOverridesByNode'
  | 'repeatOverridesByNode'
  | 'queryOverridesByNode'
>

export function useFlowBuilderOverrides(initial: OverridesInit) {
  // Function expression overrides per node (e.g. { "step_1": { "amount": { mode: "fn", value: "sum(a,b)" } } }).
  // Starts empty because fn overrides are always user-created, never from bootstrap.
  const [fnOverridesByNode, setFnOverridesByNode] = useState<Record<string, FnOverrides>>({})

  // Field value overrides for the "set" block – determines what data each step produces.
  const [setOverridesByNode, setSetOverridesByNode] = useState<Record<string, Record<string, unknown>>>(
    initial.setOverridesByNode ?? {},
  )

  // Custom headers that each step sends with its message (e.g. Kafka headers).
  const [headerOverridesByNode, setHeaderOverridesByNode] = useState<Record<string, Record<string, string>>>(
    initial.headerOverridesByNode ?? {},
  )

  // Wait duration (as a string like "5s" or "100ms") before a step executes.
  const [waitOverridesByNode, setWaitOverridesByNode] = useState<Record<string, string>>(
    initial.waitOverridesByNode ?? {},
  )

  // Binary wire format config – only relevant for protobuf schemas.
  const [wireFormatOverridesByNode, setWireFormatOverridesByNode] = useState<Record<string, StageWireFormat>>(
    initial.wireFormatOverridesByNode ?? {},
  )

  // Workflow state mutation mappings – how each step writes back to shared workflow state.
  const [stateOverridesByNode, setStateOverridesByNode] = useState<Record<string, Record<string, unknown>>>(
    initial.stateOverridesByNode ?? {},
  )

  // Repeat/loop configuration – how many times a step runs, with optional while/until conditions.
  const [repeatOverridesByNode, setRepeatOverridesByNode] = useState<Record<string, RepeatOverrides>>(
    initial.repeatOverridesByNode ?? {},
  )

  // Database query configuration – connection, database, collection, find filters, select mappings.
  const [queryOverridesByNode, setQueryOverridesByNode] = useState<Record<string, QueryConfig>>(
    initial.queryOverridesByNode ?? {},
  )

  // Reset all overrides back to the given initial values.
  // Called by the composition hook when the user clicks "Reset".
  const resetOverrides = (next: OverridesInit) => {
    setFnOverridesByNode({})
    setSetOverridesByNode(next.setOverridesByNode ?? {})
    setHeaderOverridesByNode(next.headerOverridesByNode ?? {})
    setWaitOverridesByNode(next.waitOverridesByNode ?? {})
    setWireFormatOverridesByNode(next.wireFormatOverridesByNode ?? {})
    setStateOverridesByNode(next.stateOverridesByNode ?? {})
    setRepeatOverridesByNode(next.repeatOverridesByNode ?? {})
    setQueryOverridesByNode(next.queryOverridesByNode ?? {})
  }

  return {
    fnOverridesByNode,
    setFnOverridesByNode,
    setOverridesByNode,
    setSetOverridesByNode,
    headerOverridesByNode,
    setHeaderOverridesByNode,
    waitOverridesByNode,
    setWaitOverridesByNode,
    wireFormatOverridesByNode,
    setWireFormatOverridesByNode,
    stateOverridesByNode,
    setStateOverridesByNode,
    repeatOverridesByNode,
    setRepeatOverridesByNode,
    queryOverridesByNode,
    setQueryOverridesByNode,
    resetOverrides,
    omitNodeOverrides,
  }
}

// ──────────────────────────────────────────────────────────────
// Helper: remove a single node's entry from an override map.
// Returns the same reference if the node wasn't present (avoids
// unnecessary re-renders). Exported because the composition hook
// also uses it directly.
// ──────────────────────────────────────────────────────────────

export const omitNodeOverrides = <T>(source: Record<string, T>, nodeId: string): Record<string, T> => {
  if (!Object.prototype.hasOwnProperty.call(source, nodeId)) {
    return source
  }
  const next = { ...source }
  delete next[nodeId]
  return next
}
