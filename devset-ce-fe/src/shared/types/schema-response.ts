/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

/** DTO for workflow schema responses from the API. */
export type WorkflowSchemaResponseDto = {
  id: string
  version: number
  type?: unknown
  schema: unknown
  schemaType?: unknown
  format?: unknown
  kind?: unknown
}
