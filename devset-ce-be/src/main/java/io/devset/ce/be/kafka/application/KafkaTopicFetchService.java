/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.kafka.application;

import io.devset.ce.be.kafka.application.dto.KafkaMessageDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.consumer.OffsetAndTimestamp;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.header.Header;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Fetches the last N messages from a Kafka topic using a short-lived consumer.
 * <p>
 * Creates a temporary consumer with a unique group ID, seeks to the end of each
 * partition, rewinds by the requested amount, polls records and returns them
 * sorted by timestamp descending. The consumer is always closed after the fetch.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaTopicFetchService {

    private static final int MAX_LIMIT = 500;
    private static final int DEFAULT_LIMIT = 50;
    private static final Duration FIRST_POLL_TIMEOUT = Duration.ofSeconds(2);
    private static final Duration NEXT_POLL_TIMEOUT = Duration.ofMillis(500);
    private static final long POLL_DEADLINE_NANOS = TimeUnit.SECONDS.toNanos(10);

    private final DynamicKafkaProducerManager dynamicKafkaProducerManager;

    /**
     * Fetches the last {@code limit} messages from the given topic.
     * <p>
     * When {@code beforeTimestamp} is {@code null}, fetches the newest messages (first page).
     * When provided, fetches messages older than that timestamp (next page cursor).
     *
     * @param connectionName  registered Kafka connection to use
     * @param topic           topic to read from
     * @param limit           maximum number of messages to return (capped at {@value MAX_LIMIT})
     * @param beforeTimestamp  cursor — only messages with timestamp strictly before this value are returned
     * @return messages sorted by timestamp descending (newest first)
     */
    public List<KafkaMessageDto> fetchLatest(String connectionName, String topic, Integer limit,
                                             @Nullable Instant beforeTimestamp) {
        int effectiveLimit = clampLimit(limit);

        try (KafkaConsumer<String, String> consumer =
                     dynamicKafkaProducerManager.createStreamingConsumer(connectionName, "latest")) {

            var partitionInfos = consumer.partitionsFor(topic);
            if (partitionInfos == null || partitionInfos.isEmpty()) {
                return List.of();
            }

            List<TopicPartition> partitions = partitionInfos.stream()
                    .map(info -> new TopicPartition(topic, info.partition()))
                    .toList();

            consumer.assign(partitions);

            if (beforeTimestamp != null) {
                seekBeforeTimestamp(consumer, partitions, beforeTimestamp, effectiveLimit);
            } else {
                seekFromEnd(consumer, partitions, effectiveLimit);
            }

            List<KafkaMessageDto> messages = pollMessages(consumer, effectiveLimit, beforeTimestamp);

            messages.sort(Comparator.comparing(KafkaMessageDto::timestamp).reversed());

            if (messages.size() > effectiveLimit) {
                return messages.subList(0, effectiveLimit);
            }
            return messages;
        }
    }

    private void seekFromEnd(KafkaConsumer<String, String> consumer,
                             List<TopicPartition> partitions, int limit) {
        int perPartition = (int) Math.ceil((double) limit / partitions.size());
        consumer.seekToEnd(partitions);
        for (TopicPartition partition : partitions) {
            long endOffset = consumer.position(partition);
            consumer.seek(partition, Math.max(0, endOffset - perPartition));
        }
    }

    private void seekBeforeTimestamp(KafkaConsumer<String, String> consumer,
                                    List<TopicPartition> partitions,
                                    Instant beforeTimestamp, int limit) {
        int perPartition = (int) Math.ceil((double) limit / partitions.size());

        Map<TopicPartition, Long> timestampQuery = new HashMap<>();
        for (TopicPartition partition : partitions) {
            timestampQuery.put(partition, beforeTimestamp.toEpochMilli());
        }

        Map<TopicPartition, OffsetAndTimestamp> offsets = consumer.offsetsForTimes(timestampQuery);

        consumer.seekToEnd(partitions);
        for (TopicPartition partition : partitions) {
            OffsetAndTimestamp offsetAndTimestamp = offsets.get(partition);
            long cursorOffset = offsetAndTimestamp != null
                    ? offsetAndTimestamp.offset()
                    : consumer.position(partition);
            consumer.seek(partition, Math.max(0, cursorOffset - perPartition));
        }
    }

    /**
     * Lists all available topics on the given Kafka connection.
     *
     * @param connectionName registered Kafka connection to query
     * @return set of topic names available on the broker
     */
    public Set<String> listTopics(String connectionName) {
        try (KafkaConsumer<String, String> consumer =
                     dynamicKafkaProducerManager.createStreamingConsumer(connectionName, "latest")) {
            return consumer.listTopics().keySet();
        }
    }

    private List<KafkaMessageDto> pollMessages(KafkaConsumer<String, String> consumer,
                                               int limit,
                                               @Nullable Instant beforeTimestamp) {
        List<KafkaMessageDto> messages = new ArrayList<>();
        long beforeMs = beforeTimestamp != null ? beforeTimestamp.toEpochMilli() : Long.MAX_VALUE;
        long deadline = System.nanoTime() + POLL_DEADLINE_NANOS;
        boolean firstPoll = true;

        while (messages.size() < limit && System.nanoTime() < deadline) {
            var records = consumer.poll(firstPoll ? FIRST_POLL_TIMEOUT : NEXT_POLL_TIMEOUT);
            firstPoll = false;

            if (records.isEmpty()) {
                break;
            }

            for (ConsumerRecord<String, String> record : records) {
                if (record.timestamp() < beforeMs) {
                    messages.add(toDto(record));
                }
            }
        }
        return messages;
    }

    private int clampLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }

    private KafkaMessageDto toDto(ConsumerRecord<String, String> record) {
        return new KafkaMessageDto(
                record.partition(),
                record.offset(),
                Instant.ofEpochMilli(record.timestamp()),
                record.key(),
                extractHeaders(record),
                record.value()
        );
    }

    private Map<String, String> extractHeaders(ConsumerRecord<String, String> record) {
        Map<String, String> result = new HashMap<>();
        for (Header header : record.headers()) {
            result.put(
                    header.key(),
                    header.value() == null ? null : new String(header.value(), StandardCharsets.UTF_8)
            );
        }
        return result;
    }
}
