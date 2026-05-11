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

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;

import java.util.Map;

/**
 * Handles building and sending Kafka messages for both text and binary payloads.
 * <p>
 * Package-private helper used by {@link DynamicKafkaProducerManagerImpl}.
 * Looks up the appropriate {@link KafkaTemplate} by producer name and constructs
 * Spring {@link Message} instances with topic and header metadata.
 */
@Slf4j
@RequiredArgsConstructor
final class KafkaMessageSender {

    private final Map<String, KafkaTemplate<String, String>> producers;
    private final Map<String, KafkaTemplate<String, byte[]>> binaryProducers;

    /**
     * Sends a text message to the specified Kafka topic.
     *
     * @param producerName the registered producer name
     * @param topic        the target topic
     * @param headers      optional message headers, may be {@code null}
     * @param message      the message payload, {@code null} is sent as empty string
     */
    void sendMessage(String producerName, String topic, String key, Map<String, Object> headers, String message) {
        KafkaTemplate<String, String> producer = producers.get(producerName);
        if (producer == null) {
            throw new IllegalStateException("Producer not found: " + producerName);
        }

        MessageBuilder<String> messageBuilder = MessageBuilder
                .withPayload(message == null ? "" : message)
                .setHeader(KafkaHeaders.TOPIC, topic);

        if (key != null) {
            messageBuilder.setHeader(KafkaHeaders.KEY, key);
        }

        if (headers != null) {
            headers.forEach(messageBuilder::setHeader);
        }

        Message<String> kafkaMessage = messageBuilder.build();

        log.debug(
                "Sending Kafka message: producerName={}, topic={}, key={}, headerCount={}",
                producerName,
                topic,
                key,
                headers == null ? 0 : headers.size()
        );
        producer.send(kafkaMessage);
    }

    /**
     * Sends a binary message to the specified Kafka topic.
     *
     * @param producerName the registered producer name
     * @param topic        the target topic
     * @param key          message key for partitioning; {@code null} means no key
     * @param headers      optional message headers, may be {@code null}
     * @param message      the binary payload
     */
    void sendBinaryMessage(String producerName, String topic, String key, Map<String, Object> headers, byte[] message) {
        KafkaTemplate<String, byte[]> producer = binaryProducers.get(producerName);
        if (producer == null) {
            throw new IllegalStateException("Producer not found: " + producerName);
        }

        MessageBuilder<byte[]> messageBuilder = MessageBuilder
                .withPayload(message)
                .setHeader(KafkaHeaders.TOPIC, topic);

        if (key != null) {
            messageBuilder.setHeader(KafkaHeaders.KEY, key);
        }

        if (headers != null) {
            headers.forEach(messageBuilder::setHeader);
        }

        Message<byte[]> kafkaMessage = messageBuilder.build();

        log.debug(
                "Sending Kafka message: producerName={}, topic={}, key={}, headerCount={}, payloadBytes={}",
                producerName,
                topic,
                key,
                headers == null ? 0 : headers.size(),
                message == null ? 0 : message.length
        );
        producer.send(kafkaMessage);
    }
}
