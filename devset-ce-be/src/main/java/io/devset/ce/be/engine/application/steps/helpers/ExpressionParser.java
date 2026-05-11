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

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Low-level DSL argument parser shared by expression evaluators.
 * <p>
 * Responsibilities: argument splitting (quote/parenthesis-aware), operand resolution
 * (literal → typed Java value, or state-path → state lookup), and path normalization
 * ({@code .field} shorthand → {@code currentEvent.field}).
 * <p>
 * This is a parsing utility only — no evaluation. Evaluation lives in
 * {@link SetFieldExpressionResolver} (for {@code $fn} expressions) and
 * {@link ConditionEvaluator} (for condition comparisons).
 */
final class ExpressionParser {

    private static final String CURRENT_EVENT_SHORTHAND_PREFIX = ".";
    private static final String CONTEXT_PREFIX = "context.";
    private static final String STATE_PREFIX = "state.";

    private ExpressionParser() {
    }

    // Flat state-machine loop: each branch handles exactly one character class. Extracting
    // scanChar()/handleQuote() helpers would scatter the state variables and reduce clarity.
    static List<String> splitArguments(String rawArguments, String functionName, String stepId) {
        if (rawArguments == null) {
            throw new WorkflowEngineException(functionName + " arguments must not be null for step: " + stepId);
        }

        List<String> arguments = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inSingleQuotes = false;
        boolean inDoubleQuotes = false;
        int parenthesisDepth = 0;

        for (int index = 0; index < rawArguments.length(); index++) {
            char currentChar = rawArguments.charAt(index);
            if (currentChar == '\'' && !inDoubleQuotes) {
                inSingleQuotes = !inSingleQuotes;
                current.append(currentChar);
                continue;
            }
            if (currentChar == '"' && !inSingleQuotes) {
                inDoubleQuotes = !inDoubleQuotes;
                current.append(currentChar);
                continue;
            }
            if (!inSingleQuotes && !inDoubleQuotes) {
                if (currentChar == '(') {
                    parenthesisDepth++;
                    current.append(currentChar);
                    continue;
                }
                if (currentChar == ')') {
                    if (parenthesisDepth == 0) {
                        throw new WorkflowEngineException("Unbalanced parentheses in " + functionName + " for step: " + stepId);
                    }
                    parenthesisDepth--;
                    current.append(currentChar);
                    continue;
                }
            }
            if (currentChar == ',' && !inSingleQuotes && !inDoubleQuotes && parenthesisDepth == 0) {
                arguments.add(current.toString().trim());
                current.setLength(0);
                continue;
            }
            current.append(currentChar);
        }

        if (inSingleQuotes || inDoubleQuotes) {
            throw new WorkflowEngineException("Unclosed quoted argument in " + functionName + " for step: " + stepId);
        }
        if (parenthesisDepth != 0) {
            throw new WorkflowEngineException("Unbalanced parentheses in " + functionName + " for step: " + stepId);
        }

        arguments.add(current.toString().trim());
        return arguments;
    }

    static Object resolveOperand(String argument, ExecutionPlanRuntimeContext context) {
        String trimmed = argument.trim();
        if (trimmed.isEmpty()) {
            throw new WorkflowEngineException("expression argument must not be blank");
        }
        if (isQuoted(trimmed)) {
            return trimmed.substring(1, trimmed.length() - 1);
        }
        if ("true".equalsIgnoreCase(trimmed) || "false".equalsIgnoreCase(trimmed)) {
            return Boolean.parseBoolean(trimmed);
        }
        if (trimmed.matches("[-]?\\d+")) {
            try {
                return Integer.parseInt(trimmed);
            } catch (NumberFormatException exception) {
                return Long.parseLong(trimmed);
            }
        }
        if (trimmed.matches("[-]?\\d+\\.\\d+")) {
            return new BigDecimal(trimmed);
        }
        String normalizedPath = normalizePath(trimmed);
        if (context != null && isStatePath(normalizedPath)) {
            return context.state().get(normalizedPath);
        }
        return normalizedPath;
    }

    static boolean isStatePath(String value) {
        String normalizedPath = normalizePath(value);
        return normalizedPath.startsWith(ExecutionStateKeys.CURRENT_EVENT_PREFIX)
                || value.startsWith(ExecutionStateKeys.LAST_APPENDED_EVENT_PREFIX)
                || value.startsWith(CONTEXT_PREFIX)
                || value.startsWith(ExecutionStateKeys.META_PREFIX)
                || value.startsWith(STATE_PREFIX);
    }

    static String normalizePath(String value) {
        // Convenience alias used in DSL function arguments:
        // ".field" -> "currentEvent.field"
        if (value.startsWith(CURRENT_EVENT_SHORTHAND_PREFIX) && value.length() > 1) {
            return ExecutionStateKeys.CURRENT_EVENT_PREFIX + value.substring(1);
        }
        return value;
    }

    private static boolean isQuoted(String value) {
        return value.length() >= 2
                && ((value.startsWith("'") && value.endsWith("'"))
                || (value.startsWith("\"") && value.endsWith("\"")));
    }
}
