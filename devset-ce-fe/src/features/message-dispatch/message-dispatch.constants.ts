/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

export const DEFAULT_STEP_STATE = JSON.stringify(
  {
    id: 'evt-1',
    source: 'dispatch-ui',
    amount: 100,
  },
  null,
  2,
)

export const DEFAULT_PROTO_SCHEMA = `syntax = "proto2";

package example.dispatch;

message ExampleMessage {
  required string userId = 1;
  required bool userActive = 2;
}
`

export const DEFAULT_STAGE = 'single-step'
export const DEFAULT_EVENT = 'single-step-event'
