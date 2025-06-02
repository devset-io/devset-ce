/*
 * This file is part of Devset CE.
 *
 * Copyright (C) "2025" Dominik Martyniak
 *
 * Devset CE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Devset CE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Devset CE. If not, see <https://www.gnu.org/licenses/>.
 */

package io.devset.ce.flows.services.strategies.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.devset.ce.common.FieldRuleDto;
import io.devset.ce.common.RuleDto;
import io.devset.ce.flows.FlowElement;
import lombok.experimental.UtilityClass;
import org.apache.logging.log4j.util.Strings;

import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import static io.devset.ce.common.JsonFiledTypes.*;
import static io.devset.ce.common.JsonFiledTypes.DEFAULT_PROPERTY;
import static io.devset.ce.common.JsonFiledTypes.EMPTY_STRING;
import static io.devset.ce.common.JsonFiledTypes.TYPE_BOOLEAN;
import static io.devset.ce.common.JsonFiledTypes.TYPE_INTEGER;
import static io.devset.ce.common.JsonFiledTypes.TYPE_NUMBER;
import static io.devset.ce.common.JsonFiledTypes.TYPE_PROPERTY;
import static io.devset.ce.common.JsonFiledTypes.TYPE_STRING;
import static io.devset.ce.common.JsonFiledTypes.UNSUPPORTED_TYPE_VALUE;

@UtilityClass
public class StrategyUtils {

    static String generateData(String payloadJson, RuleDto rule, int iteration) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode schemaNode = mapper.readTree(payloadJson);

            ObjectNode result = mapper.createObjectNode();
            JsonNode props = schemaNode.get(PROPERTIES_PROPERTY);
            if (props == null || !props.isObject()) {
                throw new IllegalArgumentException("Invalid schema: no 'properties'");
            }

            Map<String, FieldRuleDto> ruleMap = rule.getRules().stream()
                    .collect(Collectors.toMap(FieldRuleDto::getFieldName, r -> r));

            buildFromSchema(mapper, props, result, Strings.EMPTY, ruleMap, iteration);
            return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(result);

        } catch (Exception e) {
            throw new RuntimeException("Error generating data: " + e.getMessage(), e);
        }
    }

    private void buildFromSchema(ObjectMapper mapper, JsonNode props, ObjectNode parent, String prefix,
                                 Map<String, FieldRuleDto> ruleMap, int iteration) {
        props.fields().forEachRemaining(entry -> {
            String fieldName = entry.getKey();
            JsonNode definition = entry.getValue();
            String type = getFieldType(definition);
            String fullPath = createFullPath(prefix, fieldName);
            var fieldRuleDto = ruleMap.get(fullPath);

            switch (type) {
                case TYPE_OBJECT ->
                        handleObjectType(mapper, definition, parent, fieldName, fullPath, ruleMap, iteration);
                case TYPE_INTEGER, TYPE_NUMBER ->
                        handleNumericType(definition, parent, fieldName, fieldRuleDto, iteration, type);
                case TYPE_BOOLEAN -> handleBooleanType(definition, parent, fieldName, fieldRuleDto, iteration);
                case TYPE_STRING -> handleStringType(definition, parent, fieldName, fieldRuleDto);
                default -> parent.put(fieldName, UNSUPPORTED_TYPE_VALUE);
            }
        });
    }

    private String getFieldType(JsonNode definition) {
        return definition.has(TYPE_PROPERTY) ? definition.get(TYPE_PROPERTY).asText() : TYPE_STRING;
    }

    private String createFullPath(String prefix, String fieldName) {
        return prefix.isEmpty() ? fieldName : prefix + "." + fieldName;
    }

    private void handleObjectType(ObjectMapper mapper, JsonNode definition, ObjectNode parent,
                                  String fieldName, String fullPath, Map<String, FieldRuleDto> ruleMap, int iteration) {
        ObjectNode nested = mapper.createObjectNode();
        parent.set(fieldName, nested);
        if (definition.has(PROPERTIES_PROPERTY)) {
            buildFromSchema(mapper, definition.get(PROPERTIES_PROPERTY), nested, fullPath, ruleMap, iteration);
        }
    }

    private void handleNumericType(JsonNode definition, ObjectNode parent, String fieldName,
                                   FieldRuleDto rule, int iteration, String type) {
        var value = calculateIncrementNumericValue(definition, rule, iteration);
        if (TYPE_INTEGER.equals(type) || TYPE_NUMBER.equals(type)) {
            parent.put(fieldName, value);
        } else {
            parent.put(fieldName, (double) value);
        }
    }

    private int calculateIncrementNumericValue(JsonNode definition, FieldRuleDto rule, int iteration) {
        if (rule != null && iteration <= rule.getRepetitions() && rule.getDefaultValue() != null) {
            return Integer.parseInt(rule.getDefaultValue()) + (iteration * rule.getIncrement());
        } else if(Objects.nonNull(rule) && rule.getDefaultValue() != null) {
            return Integer.parseInt(rule.getDefaultValue());
        }
        else if (definition.has(DEFAULT_PROPERTY)) {
            return definition.get(DEFAULT_PROPERTY).asInt();
        } else {
            return 0;
        }
    }

    private void handleBooleanType(JsonNode definition, ObjectNode parent, String fieldName, FieldRuleDto rule, int iteration) {
        boolean value = (rule != null) ? (iteration % 2 == 0) : (definition.has(DEFAULT_PROPERTY) && definition.get(DEFAULT_PROPERTY).asBoolean()); //todo
        parent.put(fieldName, value);
    }

    private void handleStringType(JsonNode definition, ObjectNode parent, String fieldName, FieldRuleDto rule) {
        String value = determineStringValue(definition, rule);
        parent.put(fieldName, value);
    }

    private String determineStringValue(JsonNode definition, FieldRuleDto rule) {
        if (rule != null && rule.getDefaultValue() != null) {
            return rule.getDefaultValue();
        } else if (definition.has(DEFAULT_PROPERTY)) {
            return definition.get(DEFAULT_PROPERTY).asText();
        } else {
            return EMPTY_STRING;
        }
    }
}
