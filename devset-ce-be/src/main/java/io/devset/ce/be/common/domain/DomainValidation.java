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
 * Shared validation helpers for domain records.
 * Pure Java — no framework dependencies.
 */
public final class DomainValidation {

    private DomainValidation() {
    }

    /**
     * Validates that the given text value is not null or blank.
     *
     * @param value     the text value to validate
     * @param fieldName the field name used in the error message
     * @return the trimmed value
     * @throws WorkflowEngineException if value is null or blank
     */
    public static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new WorkflowEngineException(fieldName + " must not be blank");
        }
        return value.trim();
    }
}
