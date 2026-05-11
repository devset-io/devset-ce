/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.config;

import io.devset.ce.be.common.domain.WorkflowEngineException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Global exception handler for all REST controllers in the application.
 * <p>
 * Catches {@link WorkflowEngineException}, {@link IllegalArgumentException} and
 * {@link NullPointerException} and returns a 400 Bad Request response with the error message.
 * Scoped to the root package so all controllers are covered without importing them individually.
 */
@RestControllerAdvice(basePackages = "io.devset.ce.be")
public class GlobalApiExceptionHandler {

    /**
     * Handles domain and validation errors by returning a 400 Bad Request response.
     *
     * @param exception the caught runtime exception
     * @return map containing the error message
     */
    @ExceptionHandler({
            WorkflowEngineException.class,
            IllegalArgumentException.class,
            NullPointerException.class
    })
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleError(RuntimeException exception) {
        return Map.of("message", exception.getMessage());
    }
}
