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
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SetFieldExpressionResolverTest {

    private final SetFieldExpressionResolver resolver = new SetFieldExpressionResolver();

    @Test
    void shouldResolveExactFunctions() {
        Object uuid = resolver.resolve("uuid()", null, "step-1");
        Object stringValue = resolver.resolve("string()", null, "step-1");
        Object bool = resolver.resolve("BOOLEAN()", null, "step-1");
        Object now = resolver.resolve("now()", null, "step-1");
        Object nowSeconds = resolver.resolve("nowS()", null, "step-1");
        Object nowMilliseconds = resolver.resolve("nowMs()", null, "step-1");

        assertInstanceOf(String.class, uuid);
        assertInstanceOf(String.class, stringValue);
        assertInstanceOf(Boolean.class, bool);
        assertInstanceOf(String.class, now);
        assertInstanceOf(Long.class, nowSeconds);
        assertInstanceOf(Long.class, nowMilliseconds);
        assertTrue((Long) nowSeconds <= Instant.now().getEpochSecond());
        assertTrue((Long) nowMilliseconds <= Instant.now().toEpochMilli());
    }

    @Test
    void shouldResolveNumericRangeFunctions() {
        assertEquals(7, resolver.resolve("int(7,7)", null, "step-1"));
        assertEquals(11L, resolver.resolve("long(11,11)", null, "step-1"));
    }

    @Test
    void shouldResolveChoiceFunctions() {
        assertEquals("ONLY", resolver.resolve("choice(ONLY)", null, "step-1"));
        assertEquals("A", resolver.resolve("choiceWeighted(A:1)", null, "step-1"));
    }

    @Test
    void shouldResolveNestedArithmeticWithStateOperands() {
        ExecutionPlanRuntimeContext context = runtimeContext(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, Map.of("value", 10),
                "state", Map.of("base", 4)
        ));

        Object result = resolver.resolve("add(currentEvent.value,sub(state.base,1))", context, "step-1");

        assertEquals(13, result);
    }

    @Test
    void shouldThrowForInvalidArgumentCount() {
        WorkflowEngineException exception = assertThrows(
                WorkflowEngineException.class,
                () -> resolver.resolve("add(1)", null, "step-1")
        );

        assertEquals("add requires exactly 2 arguments", exception.getMessage());
    }

    @Test
    void shouldThrowForUnsupportedFunction() {
        WorkflowEngineException exception = assertThrows(
                WorkflowEngineException.class,
                () -> resolver.resolve("unknown(1)", null, "step-1")
        );

        assertTrue(exception.getMessage().contains("Unsupported valueExpression 'unknown(1)'"));
    }

    @Test
    void shouldRequireParenthesesForZeroArgFunctions() {
        WorkflowEngineException exception = assertThrows(
                WorkflowEngineException.class,
                () -> resolver.resolve("string", null, "step-1")
        );

        assertTrue(exception.getMessage().contains("Unsupported valueExpression 'string'"));
    }

    // ── numeric type promotion (add / sub / percent) ──────────────────────

    @Test
    void shouldAddTwoIntegers() {
        Number result = (Number) resolver.resolve("add(3, 7)", null, "step-1");
        assertInstanceOf(Integer.class, result);
        assertEquals(10, result.intValue());
    }

    @Test
    void shouldAddLongFromStateAndInteger() {
        ExecutionPlanRuntimeContext context = runtimeContext(Map.of("state", Map.of("accumulator", 5L)));
        Number result = (Number) resolver.resolve("add(state.accumulator, 3)", context, "step-1");
        assertInstanceOf(Long.class, result);
        assertEquals(8L, result.longValue());
    }

    @Test
    void shouldSubtractTwoIntegers() {
        Number result = (Number) resolver.resolve("sub(10, 4)", null, "step-1");
        assertInstanceOf(Integer.class, result);
        assertEquals(6, result.intValue());
    }

    @Test
    void shouldComputePercent() {
        Number result = (Number) resolver.resolve("percent(50, 200)", null, "step-1");
        assertInstanceOf(BigDecimal.class, result);
        assertEquals(new BigDecimal("25.0000"), result);
    }

    @Test
    void shouldThrowWhenPercentDivisorIsZero() {
        assertThrows(WorkflowEngineException.class,
                () -> resolver.resolve("percent(10, 0)", null, "step-1"));
    }

    private ExecutionPlanRuntimeContext runtimeContext(Map<String, Object> stateRoot) {
        return new ExecutionPlanRuntimeContext(
                new ExecutionPlanState(new LinkedHashMap<>(stateRoot)),
                new ArrayList<>(),
                (step, event) -> {},
                false
        );
    }
}
