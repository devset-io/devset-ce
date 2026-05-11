/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.kafka.infrastructure;

import io.devset.ce.be.common.domain.ConnectionType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.kafka.application.DynamicKafkaProducerManager;
import io.devset.ce.be.kafka.application.dto.KafkaConnectionStatusDto;
import io.devset.ce.be.engine.application.ExecutionPlanRunService;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.ByteArraySerializer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;


/**
 * Infrastructure adapter implementing dynamic Kafka producer management.
 * <p>
 * Manages per-connection {@link KafkaTemplate} instances for both text and binary producers.
 * Connections are stored in-memory and can be created, reused, or removed at runtime.
 * Overwriting or removing a connection is blocked when active execution plan runs reference it.
 */
@Component
@Slf4j
public class DynamicKafkaProducerManagerImpl implements DynamicKafkaProducerManager {

    private final ExecutionPlanRunService runService;
    private final Map<String, KafkaTemplate<String, String>> producers = new ConcurrentHashMap<>();
    private final Map<String, KafkaTemplate<String, byte[]>> binaryProducers = new ConcurrentHashMap<>();
    private final Map<String, ConnectionConfig> connections = new ConcurrentHashMap<>();
    private final KafkaMessageSender messageSender = new KafkaMessageSender(producers, binaryProducers);

    DynamicKafkaProducerManagerImpl(ExecutionPlanRunService runService) {
        this.runService = runService;
    }

    @Override
    public void connect(
            String name,
            String bootstrapServers,
            @Nullable String username,
            @Nullable String password
    ) {
        ConnectionConfig newConfig = new ConnectionConfig(bootstrapServers, username, password);
        ConnectionConfig existingConfig = connections.get(name);

        if (newConfig.equals(existingConfig) && producers.containsKey(name) && binaryProducers.containsKey(name)) {
            log.debug("Kafka connection already exists and will be reused: name={}", name);
            return;
        }
        if (existingConfig != null && runService.hasActiveRunUsingConnector(ConnectionType.KAFKA, name)) {
            throw new WorkflowEngineException("Cannot overwrite Kafka connector while active runs use it: " + name);
        }

        closeProducer(name);
        createProducer(name, bootstrapServers, username, password);
        connections.put(name, newConfig);
    }

    @Override
    public void remove(String name) {
        if (!connections.containsKey(name)) {
            throw new WorkflowEngineException("Kafka connector not found: " + name);
        }
        if (runService.hasActiveRunUsingConnector(ConnectionType.KAFKA, name)) {
            throw new WorkflowEngineException("Cannot remove Kafka connector while active runs use it: " + name);
        }

        closeProducer(name);
        connections.remove(name);
    }

    @Override
    public List<KafkaConnectionStatusDto> listConnections() {
        return connections.entrySet()
                .stream()
                .map(entry -> new KafkaConnectionStatusDto(
                        entry.getKey(),
                        entry.getValue().bootstrapServers(),
                        producers.containsKey(entry.getKey()) && binaryProducers.containsKey(entry.getKey()),
                        false,
                        entry.getValue().authenticated()
                ))
                .sorted(java.util.Comparator.comparing(KafkaConnectionStatusDto::name))
                .toList();
    }


    private void createProducer(
            String name,
            String bootstrapServers,
            @Nullable String username,
            @Nullable String password
    ) {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 10);
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 65_536);
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");

        if (username != null && password != null) {
            props.put("security.protocol", "SASL_SSL");
            props.put("sasl.mechanism", "PLAIN");
            props.put("sasl.jaas.config", String.format(
                    "org.apache.kafka.common.security.plain.PlainLoginModule required " +
                            "username=\"%s\" password=\"%s\";", username, password
            ));
        }

        ProducerFactory<String, String> factory = new DefaultKafkaProducerFactory<>(props);
        KafkaTemplate<String, String> template = new KafkaTemplate<>(factory);

        producers.put(name, template);

        Map<String, Object> binaryProps = new HashMap<>(props);
        binaryProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, ByteArraySerializer.class);
        ProducerFactory<String, byte[]> binaryFactory = new DefaultKafkaProducerFactory<>(binaryProps);
        KafkaTemplate<String, byte[]> binaryTemplate = new KafkaTemplate<>(binaryFactory);

        binaryProducers.put(name, binaryTemplate);
    }

    private void closeProducer(String name) {
        KafkaTemplate<String, String> existingProducer = producers.remove(name);
        if (existingProducer != null) {
            ProducerFactory<String, String> producerFactory = existingProducer.getProducerFactory();
            if (producerFactory instanceof DefaultKafkaProducerFactory<String, String> defaultKafkaProducerFactory) {
                defaultKafkaProducerFactory.destroy();
            }
        }
        KafkaTemplate<String, byte[]> existingBinaryProducer = binaryProducers.remove(name);
        if (existingBinaryProducer != null) {
            ProducerFactory<String, byte[]> binaryProducerFactory = existingBinaryProducer.getProducerFactory();
            if (binaryProducerFactory instanceof DefaultKafkaProducerFactory<String, byte[]> defaultBinaryProducerFactory) {
                defaultBinaryProducerFactory.destroy();
            }
        }
    }

    @Override
    public void sendMessage(String producerName, String topic, String key, Map<String, Object> headers, String message) {
        messageSender.sendMessage(producerName, topic, key, headers, message);
    }

    @Override
    public void sendBinaryMessage(String producerName, String topic, String key, Map<String, Object> headers, byte[] message) {
        messageSender.sendBinaryMessage(producerName, topic, key, headers, message);
    }

    @Override
    public KafkaConsumer<String, String> createStreamingConsumer(String connectionName, String offsetMode) {
        ConnectionConfig connectionConfig = connections.get(connectionName);

        if (connectionConfig == null) {
            throw new WorkflowEngineException("Kafka connection not found: " + connectionName);
        }

        Properties props = createConsumerProperties(
                connectionConfig.bootstrapServers(),
                connectionConfig.username(),
                connectionConfig.password()
        );
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "monitor-stream-" + UUID.randomUUID());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, normalizeOffsetMode(offsetMode));

        return new KafkaConsumer<>(props);
    }

    private Properties createConsumerProperties(
            String bootstrapServers,
            @Nullable String username,
            @Nullable String password
    ) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "monitor-" + UUID.randomUUID());
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");

        if (username != null && password != null) {
            props.put("security.protocol", "SASL_SSL");
            props.put("sasl.mechanism", "PLAIN");
            props.put("sasl.jaas.config", String.format(
                    "org.apache.kafka.common.security.plain.PlainLoginModule required " +
                            "username=\"%s\" password=\"%s\";", username, password
            ));
        }

        return props;
    }

    private String normalizeOffsetMode(@Nullable String offsetMode) {
        String normalized = Objects.requireNonNullElse(offsetMode, "latest").trim().toLowerCase();
        if (!"latest".equals(normalized) && !"earliest".equals(normalized)) {
            throw new IllegalArgumentException("Unsupported offsetMode: " + offsetMode);
        }
        return normalized;
    }

    private record ConnectionConfig(
            String bootstrapServers,
            @Nullable String username,
            @Nullable String password
    ) {
        boolean authenticated() {
            return username != null && password != null;
        }
    }

}
