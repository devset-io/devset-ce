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

import io.devset.ce.be.common.domain.WorkflowEngineException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.BiPredicate;
import java.util.function.IntPredicate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Evaluates DSL condition objects ({@code $fn: "lt(a, b)"}, {@code eq}, {@code neq},
 * {@code lt}, {@code lte}, {@code gt}, {@code gte}) used by step handlers.
 * <p>
 * Operands may be literals (numbers, quoted strings, booleans), state path references
 * resolved against the runtime context, or nested expressions delegated to
 * {@link SetFieldExpressionResolver}.
 */
@Component
public final class ConditionEvaluator {

    private static final String CONDITION = "condition";
    private static final String FUNCTION = "$fn";
    private static final String EXPRESSION = "$expression";
    private static final Pattern CONDITION_FUNCTION = Pattern.compile("^(lt|lte|gt|gte|eq|neq)\\((.*)\\)$", Pattern.CASE_INSENSITIVE);

    // Operator dispatch tables — avoids a multi-arm switch inside matches(), reducing cyclomatic complexity.
    // COMPARE_OPS delegate to compare() which handles type checking and error messages.
    // EQUALITY_OPS use standard object equality, no type coercion needed.
    //
    // HOW TO ADD A NEW COMPARISON OPERATOR (e.g. "between"):
    //   1. Add operator name to CONDITION_FUNCTION regex above.
    //   2. Add an entry to COMPARE_OPS (numeric) or EQUALITY_OPS (equality/identity).
    //   3. Add a test in ConditionEvaluatorTest.
    private static final Map<String, IntPredicate> COMPARE_OPS = Map.of(
            "lt",  c -> c < 0,
            "lte", c -> c <= 0,
            "gt",  c -> c > 0,
            "gte", c -> c >= 0
    );
    private static final Map<String, BiPredicate<Object, Object>> EQUALITY_OPS = Map.of(
            "eq",  Objects::equals,
            "neq", (a, b) -> !Objects.equals(a, b)
    );

    private final SetFieldExpressionResolver expressionResolver;

    @Autowired
    public ConditionEvaluator(SetFieldExpressionResolver expressionResolver) {
        this.expressionResolver = expressionResolver;
    }

    /** Convenience no-arg constructor used by unit tests. */
    public ConditionEvaluator() {
        this(new SetFieldExpressionResolver());
    }

    /**
     * Evaluates condition object under provided key (for example: {@code condition}, {@code emit},
     * {@code repeatWhile}, {@code repeatUntil}).
     *
     * @param stepConfig    step configuration containing the condition entry
     * @param conditionKey  config key under which the condition lives
     * @param context       runtime context for operand resolution
     * @param stepId        step identifier used in error messages
     * @return {@code true} if the condition holds (or is absent), {@code false} otherwise
     * @throws WorkflowEngineException if the condition is malformed or uses an unsupported operator
     */
    public boolean matches(Map<String, Object> stepConfig, String conditionKey, ExecutionPlanRuntimeContext context, String stepId) {
        Object rawCondition = stepConfig.get(conditionKey);
        if (rawCondition == null) {
            return true;
        }
        if (!(rawCondition instanceof Map<?, ?> rawConditionMap)) {
            throw new WorkflowEngineException(conditionKey + " must be an object for step: " + stepId);
        }
        String functionKey = rawConditionMap.containsKey(FUNCTION) ? FUNCTION
                : rawConditionMap.containsKey(EXPRESSION) ? EXPRESSION : null;
        if (rawConditionMap.size() != 1 || functionKey == null) {
            throw new WorkflowEngineException(conditionKey + " must use '$fn' or '$expression' for step: " + stepId);
        }

        String function = normalizeFunction(rawConditionMap.get(functionKey), conditionKey, stepId);
        Matcher matcher = CONDITION_FUNCTION.matcher(function);
        if (!matcher.matches()) {
            throw new WorkflowEngineException("Unsupported " + conditionKey + " function '" + function + "' for step: " + stepId);
        }

        String operator = matcher.group(1).toLowerCase();
        List<String> arguments = ExpressionParser.splitArguments(matcher.group(2), conditionKey, stepId);
        if (arguments.size() != 2) {
            throw new WorkflowEngineException(conditionKey + " function must have exactly 2 arguments for step: " + stepId);
        }

        Object left = resolveConditionOperand(arguments.get(0), context, stepId);
        Object right = resolveConditionOperand(arguments.get(1), context, stepId);

        IntPredicate compareOp = COMPARE_OPS.get(operator);
        if (compareOp != null) {
            return compareOp.test(compare(left, right, stepId, conditionKey));
        }
        BiPredicate<Object, Object> equalityOp = EQUALITY_OPS.get(operator);
        if (equalityOp != null) {
            return equalityOp.test(left, right);
        }
        throw new WorkflowEngineException("Unsupported " + conditionKey + " function '" + function + "' for step: " + stepId);
    }

    /**
     * Convenience overload that evaluates the default {@code condition} key.
     *
     * @param stepConfig step configuration containing the {@code condition} entry
     * @param context    runtime context for operand resolution
     * @param stepId     step identifier used in error messages
     * @return {@code true} if the condition holds (or is absent), {@code false} otherwise
     */
    public boolean matches(Map<String, Object> stepConfig, ExecutionPlanRuntimeContext context, String stepId) {
        return matches(stepConfig, CONDITION, context, stepId);
    }

    private String normalizeFunction(Object rawFunction, String conditionKey, String stepId) {
        if (rawFunction == null) {
            throw new WorkflowEngineException(conditionKey + ".$fn must not be null for step: " + stepId);
        }
        String function = String.valueOf(rawFunction).trim();
        if (function.isEmpty()) {
            throw new WorkflowEngineException(conditionKey + ".$fn must not be blank for step: " + stepId);
        }
        return function;
    }

    private int compare(Object left, Object right, String stepId, String conditionKey) {
        if (left == null || right == null) {
            throw new WorkflowEngineException(conditionKey + " comparison operands must not be null for step: " + stepId);
        }
        if (left instanceof Number leftNumber && right instanceof Number rightNumber) {
            return new java.math.BigDecimal(String.valueOf(leftNumber))
                    .compareTo(new java.math.BigDecimal(String.valueOf(rightNumber)));
        }
        if (left instanceof String leftText && right instanceof String rightText) {
            return leftText.compareTo(rightText);
        }
        if (left instanceof Boolean leftBoolean && right instanceof Boolean rightBoolean) {
            return Boolean.compare(leftBoolean, rightBoolean);
        }
        throw new WorkflowEngineException(conditionKey + " comparison requires matching comparable values for step: " + stepId);
    }

    private Object resolveConditionOperand(String rawOperand, ExecutionPlanRuntimeContext context, String stepId) {
        String operand = rawOperand == null ? "" : rawOperand.trim();
        if (operand.isEmpty()) {
            throw new WorkflowEngineException("condition argument must not be blank for step: " + stepId);
        }
        if (operand.contains("(") && operand.endsWith(")")) {
            return expressionResolver.resolve(operand, context, stepId);
        }
        return ExpressionParser.resolveOperand(operand, context);
    }

}
