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
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Resolves DSL value expressions used by {@code set-field} and condition operands.
 * <p>
 * Supports a catalogue of generator functions ({@code uuid()}, {@code now()},
 * {@code nows()}, {@code nowms()}, {@code bool()}, {@code int(min,max)},
 * {@code long(min,max)}, {@code choice(a,b,c)}, {@code choiceWeighted(a:1,b:2)}) and
 * binary numeric operators ({@code add}, {@code sub}, {@code percent}) with nested
 * expressions. Operands may also be state paths resolved via the runtime context.
 * <p>
 * All expression-type registries and parsing utilities are kept in this class to provide
 * a single, cohesive view of the expression language. See the DSL reference in
 * CONTRIBUTING.md for a complete list of supported functions.
 */
@Component
@NoArgsConstructor
public final class SetFieldExpressionResolver {

    // ── exact-match function names ────────────────────────────────────────

    private static final String NOW_FUNCTION_CALL = "now()";
    private static final String NOW_SECONDS_FUNCTION_CALL = "nows()";
    private static final String NOW_MILLISECONDS_FUNCTION_CALL = "nowms()";
    private static final String UUID_FUNCTION_CALL = "uuid()";
    private static final String STRING_FUNCTION_CALL = "string()";
    private static final String BIT_FUNCTION_CALL = "bit()";
    private static final String BOOL_FUNCTION_CALL = "bool()";
    private static final String BOOLEAN_FUNCTION_CALL = "boolean()";

    // ── pattern-match functions ───────────────────────────────────────────

    private static final Pattern INTEGER_FUNCTION = Pattern.compile("^int\\(([-]?\\d+),\\s*([-]?\\d+)\\)$");
    private static final Pattern LONG_FUNCTION = Pattern.compile("^long\\(([-]?\\d+),\\s*([-]?\\d+)\\)$");
    private static final Pattern ADD_FUNCTION = Pattern.compile("^add\\((.*)\\)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern SUB_FUNCTION = Pattern.compile("^sub\\((.*)\\)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern PERCENT_FUNCTION = Pattern.compile("^percent\\((.*)\\)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern CHOICE_FUNCTION = Pattern.compile("^choice\\((.*)\\)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern CHOICE_WEIGHTED_FUNCTION = Pattern.compile("^choiceweighted\\((.*)\\)$", Pattern.CASE_INSENSITIVE);

    private final Map<String, ExactHandler> exactHandlers = registerExactHandlers();
    private final List<PatternHandler> patternHandlers = registerPatternHandlers();

    /**
     * Resolves a DSL {@code $fn} expression used by set/state assignments.
     * Supports generators (uuid/now/int/choice), arithmetic (add/sub/percent),
     * nested expressions and path-based operands.
     *
     * @param valueExpression expression text (e.g. {@code uuid()}, {@code add(x, 1)})
     * @param context         runtime context for path and nested-operand resolution
     * @param stepId          step identifier used in error messages; may be {@code null}
     * @return the resolved value (scalar, number, boolean or string)
     * @throws WorkflowEngineException if the expression is blank or not recognized
     */
    public Object resolve(String valueExpression, ExecutionPlanRuntimeContext context, String stepId) {
        ensureNotInterrupted(stepId);
        String trimmed = valueExpression == null ? null : valueExpression.trim();
        if (trimmed == null || trimmed.isBlank()) {
            throw unsupportedExpression(valueExpression, stepId);
        }
        String normalized = trimmed.toLowerCase();

        ExactHandler exactHandler = exactHandlers.get(normalized);
        if (exactHandler != null) {
            return exactHandler.resolve(trimmed, context, stepId);
        }
        for (PatternHandler patternHandler : patternHandlers) {
            ensureNotInterrupted(stepId);
            Object resolved = patternHandler.tryResolve(trimmed, normalized, context, stepId);
            if (resolved != PatternHandler.NO_MATCH) {
                return resolved;
            }
        }
        throw unsupportedExpression(valueExpression, stepId);
    }

    // ── registration ─────────────────────────────────────────────────────

    // HOW TO ADD A NEW ZERO-ARGUMENT EXPRESSION (e.g. "myFunc()"):
    //   1. Add a constant: private static final String MY_FUNC_CALL = "myfunc()";
    //   2. Add a Pattern constant if it takes arguments (see INTEGER_FUNCTION for reference).
    //   3. Register in registerExactHandlers() below with put(handlers, MY_FUNC_CALL, (e, c, s) -> ...);
    //   4. Add a test case in SetFieldExpressionResolverTest.shouldResolveExactFunctions().
    private Map<String, ExactHandler> registerExactHandlers() {
        LinkedHashMap<String, ExactHandler> handlers = new LinkedHashMap<>();
        put(handlers, NOW_FUNCTION_CALL,             (e, c, s) -> Instant.now().toString());
        put(handlers, NOW_SECONDS_FUNCTION_CALL,     (e, c, s) -> Instant.now().getEpochSecond());
        put(handlers, NOW_MILLISECONDS_FUNCTION_CALL,(e, c, s) -> Instant.now().toEpochMilli());
        put(handlers, UUID_FUNCTION_CALL,            (e, c, s) -> UUID.randomUUID().toString());
        put(handlers, STRING_FUNCTION_CALL,          (e, c, s) -> UUID.randomUUID().toString());

        ExactHandler randomBoolean = (e, c, s) -> ThreadLocalRandom.current().nextBoolean();
        put(handlers, BIT_FUNCTION_CALL,     randomBoolean);
        put(handlers, BOOL_FUNCTION_CALL,    randomBoolean);
        put(handlers, BOOLEAN_FUNCTION_CALL, randomBoolean);
        return Map.copyOf(handlers);
    }

    private List<PatternHandler> registerPatternHandlers() {
        return List.of(
                new PatternHandler(INTEGER_FUNCTION, true,
                        (m, e, c, s) -> resolveIntRange(m)),
                new PatternHandler(LONG_FUNCTION, true,
                        (m, e, c, s) -> resolveLongRange(m)),
                new PatternHandler(CHOICE_FUNCTION, false,
                        (m, e, c, s) -> resolveChoice(m, this::ensureNotInterrupted)),
                new PatternHandler(CHOICE_WEIGHTED_FUNCTION, false,
                        (m, e, c, s) -> resolveWeightedChoice(m.group(1), this::ensureNotInterrupted)),
                new PatternHandler(ADD_FUNCTION, false,
                        (m, e, c, s) -> resolveBinaryNumeric("add", m.group(1), c, s, SetFieldExpressionResolver::add, this::resolve, this::ensureNotInterrupted)),
                new PatternHandler(SUB_FUNCTION, false,
                        (m, e, c, s) -> resolveBinaryNumeric("sub", m.group(1), c, s, SetFieldExpressionResolver::subtract, this::resolve, this::ensureNotInterrupted)),
                new PatternHandler(PERCENT_FUNCTION, false,
                        (m, e, c, s) -> resolveBinaryNumeric("percent", m.group(1), c, s, SetFieldExpressionResolver::percent, this::resolve, this::ensureNotInterrupted))
        );
    }

    private static void put(Map<String, ExactHandler> handlers, String alias, ExactHandler handler) {
        handlers.put(alias, handler);
    }

    // ── numeric range generators ──────────────────────────────────────────

    private static Object resolveIntRange(Matcher matcher) {
        int min = Integer.parseInt(matcher.group(1));
        int max = Integer.parseInt(matcher.group(2));
        if (min > max) throw new WorkflowEngineException("minInclusive must be <= maxInclusive");
        return ThreadLocalRandom.current().nextInt(min, max + 1);
    }

    private static Object resolveLongRange(Matcher matcher) {
        long min = Long.parseLong(matcher.group(1));
        long max = Long.parseLong(matcher.group(2));
        if (min > max) throw new WorkflowEngineException("minInclusive must be <= maxInclusive");
        return ThreadLocalRandom.current().nextLong(min, max + 1);
    }

    // ── choice generators ─────────────────────────────────────────────────

    private static Object resolveChoice(Matcher matcher, Consumer<String> interruptCheck) {
        List<Object> options = parseChoiceOptions(matcher.group(1), interruptCheck);
        return options.get(ThreadLocalRandom.current().nextInt(options.size()));
    }

    private static Object resolveWeightedChoice(String rawOptions, Consumer<String> interruptCheck) {
        List<WeightedOption> options = parseWeightedOptions(rawOptions, interruptCheck);
        long totalWeight = 0L;
        for (WeightedOption o : options) { interruptCheck.accept(null); totalWeight += o.weight(); }
        long pick = ThreadLocalRandom.current().nextLong(totalWeight);
        long cumulative = 0L;
        for (WeightedOption o : options) {
            interruptCheck.accept(null);
            cumulative += o.weight();
            if (pick < cumulative) return o.value();
        }
        return options.getLast().value();
    }

    private static List<Object> parseChoiceOptions(String rawOptions, Consumer<String> interruptCheck) {
        if (rawOptions == null || rawOptions.isBlank()) {
            throw new WorkflowEngineException("choice requires at least one option");
        }
        List<Object> options = new ArrayList<>();
        for (String raw : rawOptions.split(",")) {
            interruptCheck.accept(null);
            String option = raw.trim();
            if (option.isEmpty()) throw new WorkflowEngineException("choice options must not be blank");
            options.add(parseChoiceValue(option));
        }
        if (options.isEmpty()) throw new WorkflowEngineException("choice requires at least one option");
        return options;
    }

    private static List<WeightedOption> parseWeightedOptions(String rawOptions, Consumer<String> interruptCheck) {
        if (rawOptions == null || rawOptions.isBlank()) {
            throw new WorkflowEngineException("choiceWeighted requires at least one option");
        }
        List<WeightedOption> options = new ArrayList<>();
        for (String raw : rawOptions.split(",")) {
            interruptCheck.accept(null);
            String option = raw.trim();
            if (option.isEmpty()) throw new WorkflowEngineException("choiceWeighted options must not be blank");
            int sep = option.lastIndexOf(':');
            if (sep <= 0 || sep == option.length() - 1) {
                throw new WorkflowEngineException("choiceWeighted option must use value:weight format");
            }
            String rawValue = option.substring(0, sep).trim();
            String rawWeight = option.substring(sep + 1).trim();
            if (rawValue.isEmpty() || rawWeight.isEmpty()) {
                throw new WorkflowEngineException("choiceWeighted option must use value:weight format");
            }
            long weight = Long.parseLong(rawWeight);
            if (weight <= 0) throw new WorkflowEngineException("choiceWeighted weight must be > 0");
            options.add(new WeightedOption(parseChoiceValue(rawValue), weight));
        }
        return options;
    }

    private static Object parseChoiceValue(String option) {
        if ("true".equalsIgnoreCase(option) || "false".equalsIgnoreCase(option)) return Boolean.parseBoolean(option);
        if (option.matches("[-]?\\d+")) {
            try { return Integer.parseInt(option); } catch (NumberFormatException e) { return Long.parseLong(option); }
        }
        if (option.length() >= 2 && option.startsWith("'") && option.endsWith("'")) {
            return option.substring(1, option.length() - 1);
        }
        return option;
    }

    // ── binary numeric operators ──────────────────────────────────────────

    private static Object resolveBinaryNumeric(
            String functionName,
            String rawArguments,
            ExecutionPlanRuntimeContext context,
            String stepId,
            NumericOperation operation,
            NestedResolver nestedResolver,
            Consumer<String> interruptCheck
    ) {
        interruptCheck.accept(stepId);
        List<String> args = ExpressionParser.splitArguments(rawArguments, functionName, stepId);
        if (args.size() != 2) throw new WorkflowEngineException(functionName + " requires exactly 2 arguments");
        return operation.apply(
                resolveNumericOperand(args.get(0), context, stepId, nestedResolver, interruptCheck),
                resolveNumericOperand(args.get(1), context, stepId, nestedResolver, interruptCheck)
        );
    }

    private static Number resolveNumericOperand(
            String rawOperand,
            ExecutionPlanRuntimeContext context,
            String stepId,
            NestedResolver nestedResolver,
            Consumer<String> interruptCheck
    ) {
        interruptCheck.accept(stepId);
        String operand = rawOperand == null ? "" : rawOperand.trim();
        Object resolved = (operand.contains("(") && operand.endsWith(")"))
                ? nestedResolver.resolve(operand, context, stepId)
                : ExpressionParser.resolveOperand(operand, context);
        if (!(resolved instanceof Number n)) {
            throw new WorkflowEngineException("Numeric function requires numeric arguments for step: " + stepId);
        }
        return n;
    }

    static Number add(Number left, Number right) {
        if (left instanceof BigDecimal || right instanceof BigDecimal) {
            return new BigDecimal(String.valueOf(left)).add(new BigDecimal(String.valueOf(right)));
        }
        if (left instanceof Double || right instanceof Double || left instanceof Float || right instanceof Float) {
            return left.doubleValue() + right.doubleValue();
        }
        if (left instanceof Long || right instanceof Long) return left.longValue() + right.longValue();
        return left.intValue() + right.intValue();
    }

    static Number subtract(Number left, Number right) {
        if (left instanceof BigDecimal || right instanceof BigDecimal) {
            return new BigDecimal(String.valueOf(left)).subtract(new BigDecimal(String.valueOf(right)));
        }
        if (left instanceof Double || right instanceof Double || left instanceof Float || right instanceof Float) {
            return left.doubleValue() - right.doubleValue();
        }
        if (left instanceof Long || right instanceof Long) return left.longValue() - right.longValue();
        return left.intValue() - right.intValue();
    }

    static Number percent(Number value, Number total) {
        BigDecimal divisor = new BigDecimal(String.valueOf(total));
        if (BigDecimal.ZERO.compareTo(divisor) == 0) {
            throw new WorkflowEngineException("percent divisor must not be 0");
        }
        return new BigDecimal(String.valueOf(value))
                .multiply(BigDecimal.valueOf(100))
                .divide(divisor, 4, RoundingMode.HALF_UP);
    }

    // ── interrupt check ───────────────────────────────────────────────────

    private void ensureNotInterrupted(String stepId) {
        if (!Thread.currentThread().isInterrupted()) return;
        if (stepId == null) throw new WorkflowEngineException("Value expression interrupted");
        throw new WorkflowEngineException("Value expression interrupted for step: " + stepId);
    }

    private WorkflowEngineException unsupportedExpression(String expr, String stepId) {
        if (stepId == null) return new WorkflowEngineException("Unsupported valueExpression '" + expr + "'");
        return new WorkflowEngineException("Unsupported valueExpression '" + expr + "' for step: " + stepId);
    }

    // ── private nested types ──────────────────────────────────────────────

    @FunctionalInterface
    private interface ExactHandler {
        Object resolve(String expression, ExecutionPlanRuntimeContext context, String stepId);
    }

    @FunctionalInterface
    private interface MatcherHandler {
        Object resolve(Matcher matcher, String expression, ExecutionPlanRuntimeContext context, String stepId);
    }

    private record PatternHandler(Pattern pattern, boolean matchNormalized, MatcherHandler handler) {
        static final Object NO_MATCH = new Object();

        Object tryResolve(String trimmed, String normalized, ExecutionPlanRuntimeContext context, String stepId) {
            String input = matchNormalized ? normalized : trimmed;
            Matcher m = pattern.matcher(input);
            if (!m.matches()) return NO_MATCH;
            return handler.resolve(m, trimmed, context, stepId);
        }
    }

    private record WeightedOption(Object value, long weight) {}

    @FunctionalInterface
    private interface NumericOperation {
        Number apply(Number left, Number right);
    }

    @FunctionalInterface
    private interface NestedResolver {
        Object resolve(String expression, ExecutionPlanRuntimeContext context, String stepId);
    }
}
