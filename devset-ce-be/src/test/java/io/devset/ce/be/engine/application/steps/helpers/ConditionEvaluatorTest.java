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
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConditionEvaluatorTest {

    private final ConditionEvaluator evaluator = new ConditionEvaluator();

    private ExecutionPlanRuntimeContext contextWithState(Map<String, Object> stateValues) {
        ExecutionPlanState state = new ExecutionPlanState(new LinkedHashMap<>(stateValues));
        return new ExecutionPlanRuntimeContext(state, new ArrayList<>(), (s, e) -> {}, false);
    }

    private ExecutionPlanRuntimeContext defaultContext() {
        return contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 5, "limit", 10))
        ));
    }

    private Map<String, Object> conditionConfig(String fn) {
        return Map.of("condition", new LinkedHashMap<>(Map.of("$fn", fn)));
    }

    private Map<String, Object> conditionConfig(String conditionKey, String fn) {
        return Map.of(conditionKey, new LinkedHashMap<>(Map.of("$fn", fn)));
    }

    // --- lt operator ---

    @Test
    void ltReturnsTrueWhenLeftIsLessThanRight() {
        // currentEvent.value=5, currentEvent.limit=10 => 5 < 10 = true
        assertTrue(evaluator.matches(conditionConfig("lt(.value, .limit)"), defaultContext(), "s1"));
    }

    @Test
    void ltReturnsFalseWhenLeftIsEqualToRight() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 10, "limit", 10))
        ));
        assertFalse(evaluator.matches(conditionConfig("lt(.value, .limit)"), ctx, "s1"));
    }

    @Test
    void ltReturnsFalseWhenLeftIsGreaterThanRight() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 15, "limit", 10))
        ));
        assertFalse(evaluator.matches(conditionConfig("lt(.value, .limit)"), ctx, "s1"));
    }

    // --- lte operator ---

    @Test
    void lteReturnsTrueWhenLeftIsLessThanRight() {
        assertTrue(evaluator.matches(conditionConfig("lte(.value, .limit)"), defaultContext(), "s1"));
    }

    @Test
    void lteReturnsTrueWhenLeftIsEqualToRight() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 10, "limit", 10))
        ));
        assertTrue(evaluator.matches(conditionConfig("lte(.value, .limit)"), ctx, "s1"));
    }

    @Test
    void lteReturnsFalseWhenLeftIsGreaterThanRight() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 15, "limit", 10))
        ));
        assertFalse(evaluator.matches(conditionConfig("lte(.value, .limit)"), ctx, "s1"));
    }

    // --- gt operator ---

    @Test
    void gtReturnsTrueWhenLeftIsGreaterThanRight() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 15, "limit", 10))
        ));
        assertTrue(evaluator.matches(conditionConfig("gt(.value, .limit)"), ctx, "s1"));
    }

    @Test
    void gtReturnsFalseWhenLeftIsEqualToRight() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 10, "limit", 10))
        ));
        assertFalse(evaluator.matches(conditionConfig("gt(.value, .limit)"), ctx, "s1"));
    }

    @Test
    void gtReturnsFalseWhenLeftIsLessThanRight() {
        assertFalse(evaluator.matches(conditionConfig("gt(.value, .limit)"), defaultContext(), "s1"));
    }

    // --- gte operator ---

    @Test
    void gteReturnsTrueWhenLeftIsGreaterThanRight() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 15, "limit", 10))
        ));
        assertTrue(evaluator.matches(conditionConfig("gte(.value, .limit)"), ctx, "s1"));
    }

    @Test
    void gteReturnsTrueWhenLeftIsEqualToRight() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 10, "limit", 10))
        ));
        assertTrue(evaluator.matches(conditionConfig("gte(.value, .limit)"), ctx, "s1"));
    }

    @Test
    void gteReturnsFalseWhenLeftIsLessThanRight() {
        assertFalse(evaluator.matches(conditionConfig("gte(.value, .limit)"), defaultContext(), "s1"));
    }

    // --- eq operator ---

    @Test
    void eqReturnsTrueWhenIntegersMatch() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 10, "limit", 10))
        ));
        assertTrue(evaluator.matches(conditionConfig("eq(.value, .limit)"), ctx, "s1"));
    }

    @Test
    void eqReturnsFalseWhenIntegersDiffer() {
        assertFalse(evaluator.matches(conditionConfig("eq(.value, .limit)"), defaultContext(), "s1"));
    }

    @Test
    void eqReturnsTrueWhenQuotedStringsMatch() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("status", "active"))
        ));
        assertTrue(evaluator.matches(conditionConfig("eq(.status, 'active')"), ctx, "s1"));
    }

    @Test
    void eqReturnsFalseWhenQuotedStringsDiffer() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("status", "active"))
        ));
        assertFalse(evaluator.matches(conditionConfig("eq(.status, 'inactive')"), ctx, "s1"));
    }

    @Test
    void eqReturnsTrueWhenBooleansMatch() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("enabled", true))
        ));
        assertTrue(evaluator.matches(conditionConfig("eq(.enabled, true)"), ctx, "s1"));
    }

    @Test
    void eqReturnsFalseWhenBooleansDiffer() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("enabled", true))
        ));
        assertFalse(evaluator.matches(conditionConfig("eq(.enabled, false)"), ctx, "s1"));
    }

    @Test
    void eqWithLiteralNumbers() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 42))
        ));
        assertTrue(evaluator.matches(conditionConfig("eq(.value, 42)"), ctx, "s1"));
    }

    // --- neq operator ---

    @Test
    void neqReturnsTrueWhenValuesDiffer() {
        assertTrue(evaluator.matches(conditionConfig("neq(.value, .limit)"), defaultContext(), "s1"));
    }

    @Test
    void neqReturnsFalseWhenValuesMatch() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 10, "limit", 10))
        ));
        assertFalse(evaluator.matches(conditionConfig("neq(.value, .limit)"), ctx, "s1"));
    }

    @Test
    void neqWithQuotedStrings() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("status", "active"))
        ));
        assertTrue(evaluator.matches(conditionConfig("neq(.status, 'closed')"), ctx, "s1"));
    }

    // --- missing condition key returns true ---

    @Test
    void missingConditionKeyReturnsTrue() {
        Map<String, Object> config = Map.of("someOtherKey", "value");
        assertTrue(evaluator.matches(config, "condition", defaultContext(), "s1"));
    }

    @Test
    void missingConditionKeyReturnsTrueForDefaultOverload() {
        Map<String, Object> config = Map.of("someOtherKey", "value");
        assertTrue(evaluator.matches(config, defaultContext(), "s1"));
    }

    @Test
    void missingCustomConditionKeyReturnsTrue() {
        Map<String, Object> config = Map.of("condition", new LinkedHashMap<>(Map.of("$fn", "lt(.value, .limit)")));
        assertTrue(evaluator.matches(config, "repeatWhile", defaultContext(), "s1"));
    }

    // --- invalid condition format throws ---

    @Test
    void conditionNotAnObjectThrows() {
        Map<String, Object> config = Map.of("condition", "not-an-object");
        WorkflowEngineException ex = assertThrows(WorkflowEngineException.class,
                () -> evaluator.matches(config, defaultContext(), "s1"));
        assertTrue(ex.getMessage().contains("must be an object"));
    }

    @Test
    void conditionWithoutFnKeyThrows() {
        Map<String, Object> config = Map.of("condition", new LinkedHashMap<>(Map.of("wrongKey", "lt(.value, .limit)")));
        WorkflowEngineException ex = assertThrows(WorkflowEngineException.class,
                () -> evaluator.matches(config, defaultContext(), "s1"));
        assertTrue(ex.getMessage().contains("must use"));
    }

    @Test
    void conditionWithNullFnThrows() {
        LinkedHashMap<String, Object> fnMap = new LinkedHashMap<>();
        fnMap.put("$fn", null);
        Map<String, Object> config = Map.of("condition", fnMap);
        WorkflowEngineException ex = assertThrows(WorkflowEngineException.class,
                () -> evaluator.matches(config, defaultContext(), "s1"));
        assertTrue(ex.getMessage().contains("must not be null"));
    }

    @Test
    void unsupportedFunctionThrows() {
        Map<String, Object> config = conditionConfig("unknown(.value, .limit)");
        WorkflowEngineException ex = assertThrows(WorkflowEngineException.class,
                () -> evaluator.matches(config, defaultContext(), "s1"));
        assertTrue(ex.getMessage().contains("Unsupported"));
    }

    // --- null operands in comparison throw ---

    @Test
    void ltWithNullLeftOperandThrows() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("limit", 10))
        ));
        // currentEvent.value does not exist so state.get will throw
        assertThrows(WorkflowEngineException.class,
                () -> evaluator.matches(conditionConfig("lt(.value, .limit)"), ctx, "s1"));
    }

    @Test
    void ltWithNullRightOperandThrows() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 5))
        ));
        assertThrows(WorkflowEngineException.class,
                () -> evaluator.matches(conditionConfig("lt(.value, .limit)"), ctx, "s1"));
    }

    // --- custom condition key ---

    @Test
    void matchesWithCustomConditionKey() {
        Map<String, Object> config = Map.of("repeatWhile", new LinkedHashMap<>(Map.of("$fn", "lt(.value, .limit)")));
        assertTrue(evaluator.matches(config, "repeatWhile", defaultContext(), "s1"));
    }

    // --- literal integer comparison ---

    @Test
    void ltWithLiteralInteger() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 5))
        ));
        assertTrue(evaluator.matches(conditionConfig("lt(.value, 10)"), ctx, "s1"));
    }

    @Test
    void gteWithLiteralInteger() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("value", 10))
        ));
        assertTrue(evaluator.matches(conditionConfig("gte(.value, 10)"), ctx, "s1"));
    }

    // --- case insensitivity of operator ---

    @Test
    void operatorIsCaseInsensitive() {
        assertTrue(evaluator.matches(conditionConfig("LT(.value, .limit)"), defaultContext(), "s1"));
    }

    // --- eq with double-quoted strings ---

    @Test
    void eqWithDoubleQuotedStrings() {
        ExecutionPlanRuntimeContext ctx = contextWithState(Map.of(
                ExecutionStateKeys.CURRENT_EVENT, new LinkedHashMap<>(Map.of("status", "done"))
        ));
        assertTrue(evaluator.matches(conditionConfig("eq(.status, \"done\")"), ctx, "s1"));
    }

    // --- wrong argument count ---

    @Test
    void conditionWithOneArgumentThrows() {
        Map<String, Object> config = conditionConfig("lt(.value)");
        WorkflowEngineException ex = assertThrows(WorkflowEngineException.class,
                () -> evaluator.matches(config, defaultContext(), "s1"));
        assertTrue(ex.getMessage().contains("exactly 2 arguments"));
    }

    @Test
    void conditionWithThreeArgumentsThrows() {
        Map<String, Object> config = conditionConfig("lt(.value, .limit, 3)");
        WorkflowEngineException ex = assertThrows(WorkflowEngineException.class,
                () -> evaluator.matches(config, defaultContext(), "s1"));
        assertTrue(ex.getMessage().contains("exactly 2 arguments"));
    }

    // --- $expression key (compiled template form) ---

    @Test
    void shouldAcceptExpressionKeyAsFnAlias() {
        Map<String, Object> config = Map.of("condition", new LinkedHashMap<>(Map.of("$expression", "gt(.value, 0)")));
        assertTrue(evaluator.matches(config, defaultContext(), "s1"));
    }
}
