/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type {
  BuilderNode,
  DslPayload,
  FieldOverridePayload,
  FnOverrides,
  LoadedSchema,
  SetEntry,
  StageWireFormat,
} from '../../flow-builder/types.ts'
import type { SourceMode } from '../utils/function-studio-draft.ts'

export type FunctionStudioDrawerProps = {
  isOpen: boolean
  selectedNode: BuilderNode | null
  selectedStageDsl: DslPayload['pipeline'][number] | null
  onApplySelectedStageDslRaw: (setRaw: string, stateRaw: string) => void
  selectedSource: SourceMode
  selectedEvent: string
  selectedSchema: LoadedSchema | undefined
  schemas: LoadedSchema[]
  availableEvents: string[]
  isSchemaLoading: boolean
  onSourceChange: (source: SourceMode) => void
  onSchemaChange: (event: string) => void
  setEntries: SetEntry[]
  studioSelectedField: string | null
  onSelectField: (field: string) => void
  onClose: () => void
  onSaveDraftChanges: () => Promise<void>
  setFieldOptions: string[]
  schemaRootFields: string[]
  schemaLiteralKindHints: Record<string, 'string' | 'number' | 'boolean' | 'null' | 'json'>
  schemaRequiredRootFields: string[]
  inheritedFields: string[]
  selectedFieldExpression: string | null
  selectedFieldMode: 'fn' | 'literal' | 'ref' | 'path' | 'when' | undefined
  selectedFieldValue: string | null
  selectedFieldRawValue: unknown
  selectedStageState: Record<string, unknown>
  selectedStageWireFormat: StageWireFormat | null
  onApplyFunction: (field: string, payload: FieldOverridePayload) => void
  onAddStateMapping: (
    sourceField: string,
    targetStatePath: string,
    mode: 'ref' | 'fn' | 'when',
    functionExpression?: string,
    whenValueRaw?: string,
    whenHasDefault?: boolean,
    whenDefaultRaw?: string,
  ) => void
  onRemoveStateMapping: (statePath: string) => void
  onSetStageWireFormat: (wireFormat: StageWireFormat) => void
  onClearStageWireFormat: () => void
  overrides: FnOverrides | undefined
}
