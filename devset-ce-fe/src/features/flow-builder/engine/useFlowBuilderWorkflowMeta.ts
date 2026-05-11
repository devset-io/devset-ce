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
import type { WorkflowState } from '../types'

// ──────────────────────────────────────────────────────────────
// useFlowBuilderWorkflowMeta
//
// Domain hook that holds the top-level metadata of a workflow
// definition. This is the data that appears in the "Workflow"
// panel of the sidebar (ID, producer name, Kafka topic, etc.)
// and the shared state object that all pipeline steps can
// read from and write to.
//
// None of this data depends on nodes or schemas, so it can
// live in its own hook with zero external dependencies.
//
// Returns:
//   workflowId / setWorkflowId       – unique ID of this workflow
//   producerName / setProducerName    – Kafka producer identifier
//   topic / setTopic                  – Kafka topic name
//   executions / setExecutions        – how many times to run the pipeline
//   workflowState / setWorkflowState  – shared key-value state across steps
//   isWorkflowStateEditorOpen / set…  – controls the state editor modal
//   resetMeta(next)                   – restore all fields to given values
// ──────────────────────────────────────────────────────────────

interface WorkflowMetaInit {
  id: string
  producerName: string
  topic: string
  executions: number
  workflowState: WorkflowState
}

export function useFlowBuilderWorkflowMeta(initial: WorkflowMetaInit) {
  // Unique identifier for this workflow definition.
  const [workflowId, setWorkflowId] = useState(initial.id)

  // Name of the Kafka producer that will dispatch the messages.
  const [producerName, setProducerName] = useState(initial.producerName)

  // Kafka topic (or routing key for RabbitMQ) where messages are sent.
  const [topic, setTopic] = useState(initial.topic)

  // How many times the entire pipeline should be executed.
  const [executions, setExecutions] = useState(initial.executions)

  // Shared state object – pipeline steps can read from and write to
  // these key-value pairs via state mappings. Think of it as a
  // "global variable bag" that travels through the pipeline.
  const [workflowState, setWorkflowState] = useState(initial.workflowState)

  // Controls whether the workflow state editor modal is visible.
  const [isWorkflowStateEditorOpen, setIsWorkflowStateEditorOpen] = useState(false)

  // Reset all fields back to given values. Used by the composition
  // hook when the user clicks "Reset" to discard all changes.
  const resetMeta = (next: WorkflowMetaInit) => {
    setWorkflowId(next.id)
    setProducerName(next.producerName)
    setTopic(next.topic)
    setExecutions(next.executions)
    setWorkflowState(next.workflowState)
    setIsWorkflowStateEditorOpen(false)
  }

  return {
    workflowId,
    setWorkflowId,
    producerName,
    setProducerName,
    topic,
    setTopic,
    executions,
    setExecutions,
    workflowState,
    setWorkflowState,
    isWorkflowStateEditorOpen,
    setIsWorkflowStateEditorOpen,
    resetMeta,
  }
}
