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

/**
 * Strips control characters from user-provided values before they are
 * interpolated into log messages, preventing log-injection attacks.
 */
public final class LogSanitizer {

    private LogSanitizer() {
    }

    /**
     * Replaces newlines, carriage returns, and tabs with an underscore so that
     * a single log entry cannot be split into multiple lines by user input.
     *
     * @param value the untrusted value (may be {@code null })
     * @return sanitized string safe for log interpolation, or {@code "null"}
     */
    public static String sanitize(String value) {
        if (value == null) {
            return "null";
        }
        return value.replace('\n', '_').replace('\r', '_').replace('\t', '_');
    }
}