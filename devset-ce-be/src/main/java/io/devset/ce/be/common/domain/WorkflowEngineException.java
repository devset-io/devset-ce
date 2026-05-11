/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.common.domain;

/**
 * Base runtime exception for all domain and engine errors.
 * <p>
 * All modules wrap lower-level exceptions into this type so the global
 * {@code @RestControllerAdvice} can produce a uniform HTTP error response.
 */
public class WorkflowEngineException extends RuntimeException {

    /**
     * Creates a new exception with the given message.
     *
     * @param message human-readable error description
     */
    public WorkflowEngineException(String message) {
        super(message);
    }

    /**
     * Creates a new exception with a message and a wrapped cause.
     *
     * @param message human-readable error description
     * @param cause   underlying cause
     */
    public WorkflowEngineException(String message, Throwable cause) {
        super(message, cause);
    }
}
