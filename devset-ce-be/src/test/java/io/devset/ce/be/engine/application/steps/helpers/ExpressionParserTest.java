/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps.helpers;

import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.engine.domain.ExecutionPlanState;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ExpressionParserTest {

    private static final String FUNCTION = "testFunc";
    private static final String STEP = "step-1";

    // ----- splitArguments -----

    @Nested
    class SplitArguments {

        @Test
        void simpleCommaSeparatedArguments() {
            List<String> result = ExpressionParser.splitArguments("a,b", FUNCTION, STEP);
            assertEquals(List.of("a", "b"), result);
        }

        @Test
        void trimsWhitespaceAroundArguments() {
            List<String> result = ExpressionParser.splitArguments(" a , b , c ", FUNCTION, STEP);
            assertEquals(List.of("a", "b", "c"), result);
        }

        @Test
        void singleArgument() {
            List<String> result = ExpressionParser.splitArguments("only", FUNCTION, STEP);
            assertEquals(List.of("only"), result);
        }

        @Test
        void nestedParenthesesPreserved() {
            List<String> result = ExpressionParser.splitArguments("add(1,2),3", FUNCTION, STEP);
            assertEquals(List.of("add(1,2)", "3"), result);
        }

        @Test
        void deeplyNestedParentheses() {
            List<String> result = ExpressionParser.splitArguments("f(g(1,2),h(3)),x", FUNCTION, STEP);
            assertEquals(List.of("f(g(1,2),h(3))", "x"), result);
        }

        @Test
        void singleQuotedCommaNotSplit() {
            List<String> result = ExpressionParser.splitArguments("'a,b',c", FUNCTION, STEP);
            assertEquals(List.of("'a,b'", "c"), result);
        }

        @Test
        void doubleQuotedCommaNotSplit() {
            List<String> result = ExpressionParser.splitArguments("\"a,b\",c", FUNCTION, STEP);
            assertEquals(List.of("\"a,b\"", "c"), result);
        }

        @Test
        void emptyArgument() {
            List<String> result = ExpressionParser.splitArguments("", FUNCTION, STEP);
            assertEquals(List.of(""), result);
        }

        @Test
        void nullArgumentsThrows() {
            WorkflowEngineException ex = assertThrows(WorkflowEngineException.class,
                    () -> ExpressionParser.splitArguments(null, FUNCTION, STEP));
            assertTrue(ex.getMessage().contains(FUNCTION));
            assertTrue(ex.getMessage().contains(STEP));
        }

        @Test
        void unbalancedClosingParenthesisThrows() {
            assertThrows(WorkflowEngineException.class,
                    () -> ExpressionParser.splitArguments("a)", FUNCTION, STEP));
        }

        @Test
        void unbalancedOpeningParenthesisThrows() {
            assertThrows(WorkflowEngineException.class,
                    () -> ExpressionParser.splitArguments("a(b,c", FUNCTION, STEP));
        }

        @Test
        void unclosedSingleQuoteThrows() {
            assertThrows(WorkflowEngineException.class,
                    () -> ExpressionParser.splitArguments("'abc", FUNCTION, STEP));
        }

        @Test
        void unclosedDoubleQuoteThrows() {
            assertThrows(WorkflowEngineException.class,
                    () -> ExpressionParser.splitArguments("\"abc", FUNCTION, STEP));
        }
    }

    // ----- resolveOperand -----

    @Nested
    class ResolveOperand {

        private final ExecutionPlanRuntimeContext context = new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(Map.of(
                        ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("id", 42))
                ))),
                new ArrayList<>(),
                (s, e) -> {},
                false
        );

        @Test
        void singleQuotedStringUnwrapped() {
            assertEquals("hello", ExpressionParser.resolveOperand("'hello'", context));
        }

        @Test
        void doubleQuotedStringUnwrapped() {
            assertEquals("world", ExpressionParser.resolveOperand("\"world\"", context));
        }

        @Test
        void booleanTrueResolved() {
            assertEquals(Boolean.TRUE, ExpressionParser.resolveOperand("true", context));
        }

        @Test
        void booleanFalseResolved() {
            assertEquals(Boolean.FALSE, ExpressionParser.resolveOperand("false", context));
        }

        @Test
        void booleanCaseInsensitive() {
            assertEquals(Boolean.TRUE, ExpressionParser.resolveOperand("TRUE", context));
            assertEquals(Boolean.FALSE, ExpressionParser.resolveOperand("False", context));
        }

        @Test
        void integerResolved() {
            assertEquals(42, ExpressionParser.resolveOperand("42", context));
        }

        @Test
        void negativeIntegerResolved() {
            assertEquals(-7, ExpressionParser.resolveOperand("-7", context));
        }

        @Test
        void longResolved() {
            long big = 3_000_000_000L;
            assertEquals(big, ExpressionParser.resolveOperand("3000000000", context));
        }

        @Test
        void bigDecimalResolved() {
            assertEquals(new BigDecimal("3.14"), ExpressionParser.resolveOperand("3.14", context));
        }

        @Test
        void negativeBigDecimalResolved() {
            assertEquals(new BigDecimal("-0.5"), ExpressionParser.resolveOperand("-0.5", context));
        }

        @Test
        void statePathResolvesFromContext() {
            assertEquals(42, ExpressionParser.resolveOperand("currentEvent.id", context));
        }

        @Test
        void shorthandDotPathResolvesFromContext() {
            assertEquals(42, ExpressionParser.resolveOperand(".id", context));
        }

        @Test
        void nullContextReturnsNormalizedPath() {
            assertEquals("currentEvent.id", ExpressionParser.resolveOperand("currentEvent.id", null));
        }

        @Test
        void nonStatePathReturnedAsIs() {
            assertEquals("someLiteral", ExpressionParser.resolveOperand("someLiteral", context));
        }

        @Test
        void blankArgumentThrows() {
            assertThrows(WorkflowEngineException.class,
                    () -> ExpressionParser.resolveOperand("  ", context));
        }

        @Test
        void whitespaceTrimmed() {
            assertEquals(42, ExpressionParser.resolveOperand("  42  ", context));
        }
    }

    // ----- isStatePath -----

    @Nested
    class IsStatePath {

        @Test
        void currentEventPrefix() {
            assertTrue(ExpressionParser.isStatePath("currentEvent.field"));
        }

        @Test
        void dotShorthandIsStatePath() {
            assertTrue(ExpressionParser.isStatePath(".field"));
        }

        @Test
        void lastAppendedEventPrefix() {
            assertTrue(ExpressionParser.isStatePath("lastAppendedEvent.data"));
        }

        @Test
        void contextPrefix() {
            assertTrue(ExpressionParser.isStatePath("context.key"));
        }

        @Test
        void metaPrefix() {
            assertTrue(ExpressionParser.isStatePath("meta.timestamp"));
        }

        @Test
        void statePrefix() {
            assertTrue(ExpressionParser.isStatePath("state.accumulator"));
        }

        @Test
        void plainLiteralIsNotStatePath() {
            assertFalse(ExpressionParser.isStatePath("someValue"));
        }

        @Test
        void numericLiteralIsNotStatePath() {
            assertFalse(ExpressionParser.isStatePath("123"));
        }

        @Test
        void quotedStringIsNotStatePath() {
            assertFalse(ExpressionParser.isStatePath("'currentEvent.x'"));
        }
    }

    // ----- normalizePath -----

    @Nested
    class NormalizePath {

        @Test
        void dotShorthandConverted() {
            assertEquals("currentEvent.field", ExpressionParser.normalizePath(".field"));
        }

        @Test
        void dotShorthandNestedPath() {
            assertEquals("currentEvent.a.b", ExpressionParser.normalizePath(".a.b"));
        }

        @Test
        void nonDotPrefixUnchanged() {
            assertEquals("other", ExpressionParser.normalizePath("other"));
        }

        @Test
        void fullCurrentEventPathUnchanged() {
            assertEquals("currentEvent.x", ExpressionParser.normalizePath("currentEvent.x"));
        }

        @Test
        void singleDotUnchanged() {
            assertEquals(".", ExpressionParser.normalizePath("."));
        }
    }
}
