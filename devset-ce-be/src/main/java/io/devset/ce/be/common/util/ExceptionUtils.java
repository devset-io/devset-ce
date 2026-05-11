/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.common.util;

import io.devset.ce.be.common.domain.WorkflowEngineException;

import java.util.concurrent.CompletionException;

/**
 * Shared utilities for exception unwrapping and message resolution.
 */
public final class ExceptionUtils {

    private ExceptionUtils() {
    }

    /**
     * Unwraps nested {@link CompletionException} wrappers until a root {@link RuntimeException}
     * is found. If the root is a checked exception, wraps it in a {@link WorkflowEngineException}.
     *
     * @param throwable the throwable to unwrap
     * @return a {@link RuntimeException} suitable for rethrowing
     */
    public static RuntimeException unwrapRuntime(Throwable throwable) {
        Throwable current = throwable;
        while (current instanceof CompletionException completionException && completionException.getCause() != null) {
            current = completionException.getCause();
        }
        if (current instanceof RuntimeException runtimeException) {
            return runtimeException;
        }
        return new WorkflowEngineException(resolveMessage(current));
    }

    /**
     * Extracts a human-readable message from a throwable, falling back to the class name
     * when no message is present.
     *
     * @param throwable the throwable to inspect
     * @return a non-blank message string
     */
    public static String resolveMessage(Throwable throwable) {
        String output = throwable.getMessage();
        if (output == null || output.isBlank()) {
            output = throwable.getClass().getSimpleName();
            if (output.isBlank()) {
                output = throwable.getClass().getName();
            }
        }
        return output;
    }
}
