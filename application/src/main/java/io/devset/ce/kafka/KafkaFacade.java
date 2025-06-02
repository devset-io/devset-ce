
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

package io.devset.ce.kafka;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.kafka.dto.KafkaConnectDto;
import io.devset.ce.kafka.dto.KafkaMessageDto;
import io.devset.ce.kafka.dto.KafkaTopicDto;
import io.devset.ce.kafka.dto.NewKafkaTopicDto;
import io.devset.ce.kafka.events.KafkaConnectResults;
import io.devset.ce.kafka.mappers.KafkaMapper;
import io.devset.ce.schemas.SchemaFacade;
import io.devset.ce.schemas.SchemaType;
import io.devset.ce.schemas.dto.NewSchemaDto;
import io.devset.ce.schemas.dto.PatchSchemaDto;
import io.devset.ce.schemas.dto.SchemaDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

@Component
@Slf4j
@RequiredArgsConstructor
public class KafkaFacade {

    private final KafkaMapper kafkaMapper;
    private final KafkaService service;
    private final SchemaFacade schemaFacade;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Async
    public void tryConnect(KafkaConnectDto connectDto) {
        var kafkaConfig = kafkaMapper.mapToDomain(connectDto);
        log.debug("Trying to connect to Kafka ={}", connectDto);
        try {
            service.connect(kafkaConfig);
            service.getAllTopics();
        } catch (Exception e) {
            log.error("Error connecting to Kafka ={}", connectDto, e);
            applicationEventPublisher.publishEvent(new KafkaConnectResults(this, KafkaConnectResults.Result.FAILED));
        }
    }

    @Async
    public void disconnect() {
        service.disconnect();
    }

    public List<KafkaTopicDto> getAllTopics() {
        return service.getAllTopics().stream().map(kafkaMapper::mapToDomain).toList();
    }

    public void sendMsg(KafkaMessageDto dto) {
        service.send(kafkaMapper.mapToDomain(dto));
    }

    public String formatInput(String text) {
        Objects.requireNonNull(text, "text must not be null");
        try {
            JsonNode jsonNode = objectMapper.readTree(text);
            return objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsString(jsonNode);

        } catch (JsonProcessingException e) {
            log.warn("Error converting input to JSON", e);
            return "Error converting input to JSON";
        }
    }

    public SchemaDto saveSchema(String name, String schema) {
        var value = formatInput(schema);
        return schemaFacade.save(new NewSchemaDto(SchemaType.KAFKA, name, value));
    }

    public List<SchemaDto> findSchemas() {
        return schemaFacade.findByType(SchemaType.KAFKA);
    }

    public void update(String id, String name, String payload) {
        var value = formatInput(payload);
        schemaFacade.update(new PatchSchemaDto(id, name, value));
    }

    public void deleteSchema(SchemaDto selectedSchema) {
        schemaFacade.delete(selectedSchema.getId());
    }

    public void saveTopic(NewKafkaTopicDto newTopic) {
        service.createTopic(kafkaMapper.mapToDomain(newTopic));
        service.refreshTopics();
    }
}
