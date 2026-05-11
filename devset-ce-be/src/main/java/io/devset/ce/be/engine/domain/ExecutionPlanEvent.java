/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.domain;

import java.util.Map;

/**
 * Single event produced during execution plan evaluation.
 * <p>
 * An event is attributed to a stage and carries its own headers and payload. Events
 * are collected into {@link ExecutionPlanResult#outputEvents()} and may be dispatched
 * to a broker during real execution.
 *
 * @param header    event headers
 * @param payload   event payload tree
 * @param stageName name of the pipeline stage that produced the event
 */
public record ExecutionPlanEvent(
        Map<String, Object> header,
        Map<String, Object> payload,
        String stageName
) {}
