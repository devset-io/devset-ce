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

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LogSanitizerTest {

    @Test
    void shouldReturnNullLiteralForNullInput() {
        assertThat(LogSanitizer.sanitize(null)).isEqualTo("null");
    }

    @Test
    void shouldReturnSafeStringUnchanged() {
        assertThat(LogSanitizer.sanitize("my-connection")).isEqualTo("my-connection");
    }

    @Test
    void shouldReplaceNewline() {
        assertThat(LogSanitizer.sanitize("line1\nline2")).isEqualTo("line1_line2");
    }

    @Test
    void shouldReplaceCarriageReturn() {
        assertThat(LogSanitizer.sanitize("line1\rline2")).isEqualTo("line1_line2");
    }

    @Test
    void shouldReplaceTab() {
        assertThat(LogSanitizer.sanitize("line1\tline2")).isEqualTo("line1_line2");
    }

    @Test
    void shouldReplaceCrlfSequence() {
        assertThat(LogSanitizer.sanitize("line1\r\nline2")).isEqualTo("line1__line2");
    }

    @Test
    void shouldHandleEmptyString() {
        assertThat(LogSanitizer.sanitize("")).isEqualTo("");
    }

    @Test
    void shouldReplaceMultipleOccurrences() {
        assertThat(LogSanitizer.sanitize("a\nb\nc")).isEqualTo("a_b_c");
    }
}
