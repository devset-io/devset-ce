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

package io.devset.ce.flows.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.devset.ce.common.FieldRuleDto;
import io.devset.ce.common.ProviderMetaData;
import io.devset.ce.common.RuleDto;
import io.devset.ce.flows.providers.KafkaMataData;
import io.devset.ce.kafka.KafkaFacade;
import io.devset.ce.kafka.dto.KafkaMessageConfigurationDto;
import io.devset.ce.kafka.dto.KafkaMessageDto;
import io.devset.ce.schemas.dto.SchemaDto;
import lombok.extern.slf4j.Slf4j;
import org.apache.logging.log4j.util.Strings;

import java.util.Map;
import java.util.stream.Collectors;

import static io.devset.ce.common.JsonFiledTypes.*;

@Slf4j
public class FlowWorker implements Runnable {

    private final String id;
    private int iteration = 1;
    private final SchemaDto schema;
    private final ProviderMetaData providerMetaData;
    private final RuleDto rule;
    private final int tickIntervalMillis;
    private final KafkaFacade kafkaFacade;
    private volatile boolean running = true;


    public FlowWorker(String id, ProviderMetaData providerMetaData, SchemaDto schema, RuleDto rule, int tickIntervalMillis, KafkaFacade kafkaFacade) {
        this.id = id;
        this.schema = schema;
        this.rule = rule;
        this.tickIntervalMillis = tickIntervalMillis;
        this.kafkaFacade = kafkaFacade;
        this.providerMetaData = providerMetaData;
    }

    public void stop() {
        log.info("[UI] STOP worker id [{}]", id);

        running = false;
    }

    @Override
    public void run() {
        while (running) {
            var hasIncrementedValue = rule.getRules().stream().filter(it -> it.getRepetitions() >= iteration).findFirst();
            if (hasIncrementedValue.isEmpty()) {
                log.info("[UI] Iteration reached repetition limit, exiting worker");
                stop();
                break;
            }
            log.info("[UI] Iteration [{}] worker id [{}]", iteration, id);
            var payload = generateData(schema.getPayload(), rule, iteration);

            switch (providerMetaData) {
                case KafkaMataData kafkaMeta -> kafkaFacade.sendMsg(new KafkaMessageDto(
                        payload,
                        new KafkaMessageConfigurationDto(kafkaMeta.getTopic(), null, kafkaMeta.getHeaders(rule.getId()))
                ));
                default ->
                        throw new IllegalArgumentException("Unsupported provider metadata type: " + providerMetaData.getClass());
            }

            try {
                Thread.sleep(tickIntervalMillis);
                iteration++;
            } catch (InterruptedException e) {
                log.error("Interrupted", e);
                Thread.currentThread().interrupt();
                break;
            }
        }
    }


    private String generateData(String payloadJson, RuleDto rule, int iteration) {
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
            var rule = ruleMap.get(fullPath);

            switch (type) {
                case TYPE_OBJECT ->
                        handleObjectType(mapper, definition, parent, fieldName, fullPath, ruleMap, iteration);
                case TYPE_INTEGER, TYPE_NUMBER ->
                        handleNumericType(definition, parent, fieldName, rule, iteration, type);
                case TYPE_BOOLEAN -> handleBooleanType(definition, parent, fieldName, rule, iteration);
                case TYPE_STRING -> handleStringType(definition, parent, fieldName, rule);
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
        int value = calculateNumericValue(definition, rule, iteration);
        if (TYPE_INTEGER.equals(type)) {
            parent.put(fieldName, value);
        } else {
            parent.put(fieldName, (double) value);
        }
    }

    private int calculateNumericValue(JsonNode definition, FieldRuleDto rule, int iteration) {
        if (rule != null && iteration <= rule.getRepetitions() && rule.getDefaultValue() != null) {
            return Integer.parseInt(rule.getDefaultValue()) + (iteration * rule.getIncrement());
        } else if (definition.has(DEFAULT_PROPERTY)) {
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