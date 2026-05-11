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
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.PartitionInfo;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.header.internals.RecordHeaders;
import org.apache.kafka.common.record.TimestampType;
import org.junit.jupiter.api.Test;

import org.apache.kafka.clients.consumer.OffsetAndTimestamp;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("unchecked")
class KafkaTopicFetchServiceTest {

    private final DynamicKafkaProducerManager producerManager = mock(DynamicKafkaProducerManager.class);
    private final KafkaTopicFetchService service = new KafkaTopicFetchService(producerManager);

    @Test
    void shouldFetchLatestMessagesFromSinglePartition() {
        KafkaConsumer<String, String> consumer = mock(KafkaConsumer.class);
        when(producerManager.createStreamingConsumer("conn1", "latest")).thenReturn(consumer);

        TopicPartition tp0 = new TopicPartition("my-topic", 0);
        PartitionInfo partitionInfo = new PartitionInfo("my-topic", 0, null, null, null);
        when(consumer.partitionsFor("my-topic")).thenReturn(List.of(partitionInfo));
        when(consumer.position(tp0)).thenReturn(100L);

        ConsumerRecord<String, String> record = new ConsumerRecord<>("my-topic", 0, 95, 1000L,
                TimestampType.CREATE_TIME, 0, 0, "key-1", "{\"id\":1}", new RecordHeaders(), null);

        ConsumerRecords<String, String> records = new ConsumerRecords<>(Map.of(tp0, List.of(record)));
        when(consumer.poll(any(Duration.class))).thenReturn(records, ConsumerRecords.empty());

        List<KafkaMessageDto> result = service.fetchLatest("conn1", "my-topic", 5, null);

        assertEquals(1, result.size());
        assertEquals(0, result.getFirst().partition());
        assertEquals(95, result.getFirst().offset());
        assertEquals("key-1", result.getFirst().key());
        assertEquals("{\"id\":1}", result.getFirst().value());

        verify(consumer).assign(List.of(tp0));
        verify(consumer).seekToEnd(List.of(tp0));
        verify(consumer).seek(tp0, 95L);
        verify(consumer).close();
    }

    @Test
    void shouldReturnEmptyListWhenNoMessages() {
        KafkaConsumer<String, String> consumer = mock(KafkaConsumer.class);
        when(producerManager.createStreamingConsumer("conn1", "latest")).thenReturn(consumer);

        TopicPartition tp0 = new TopicPartition("empty-topic", 0);
        PartitionInfo partitionInfo = new PartitionInfo("empty-topic", 0, null, null, null);
        when(consumer.partitionsFor("empty-topic")).thenReturn(List.of(partitionInfo));
        when(consumer.position(tp0)).thenReturn(0L);

        ConsumerRecords<String, String> emptyRecords = new ConsumerRecords<>(Map.of());
        when(consumer.poll(any(Duration.class))).thenReturn(emptyRecords);

        List<KafkaMessageDto> result = service.fetchLatest("conn1", "empty-topic", 10, null);

        assertTrue(result.isEmpty());
        verify(consumer).seek(tp0, 0L);
        verify(consumer).close();
    }

    @Test
    void shouldDefaultLimitTo50WhenNull() {
        KafkaConsumer<String, String> consumer = mock(KafkaConsumer.class);
        when(producerManager.createStreamingConsumer("conn1", "latest")).thenReturn(consumer);

        TopicPartition tp0 = new TopicPartition("my-topic", 0);
        PartitionInfo partitionInfo = new PartitionInfo("my-topic", 0, null, null, null);
        when(consumer.partitionsFor("my-topic")).thenReturn(List.of(partitionInfo));
        when(consumer.position(tp0)).thenReturn(200L);

        ConsumerRecords<String, String> emptyRecords = new ConsumerRecords<>(Map.of());
        when(consumer.poll(any(Duration.class))).thenReturn(emptyRecords);

        service.fetchLatest("conn1", "my-topic", null, null);

        verify(consumer).seek(tp0, 150L);
    }

    @Test
    void shouldCapLimitAt500() {
        KafkaConsumer<String, String> consumer = mock(KafkaConsumer.class);
        when(producerManager.createStreamingConsumer("conn1", "latest")).thenReturn(consumer);

        TopicPartition tp0 = new TopicPartition("my-topic", 0);
        PartitionInfo partitionInfo = new PartitionInfo("my-topic", 0, null, null, null);
        when(consumer.partitionsFor("my-topic")).thenReturn(List.of(partitionInfo));
        when(consumer.position(tp0)).thenReturn(10000L);

        ConsumerRecords<String, String> emptyRecords = new ConsumerRecords<>(Map.of());
        when(consumer.poll(any(Duration.class))).thenReturn(emptyRecords);

        service.fetchLatest("conn1", "my-topic", 9999, null);

        verify(consumer).seek(tp0, 9500L);
    }

    @Test
    void shouldSortMessagesByTimestampDescending() {
        KafkaConsumer<String, String> consumer = mock(KafkaConsumer.class);
        when(producerManager.createStreamingConsumer("conn1", "latest")).thenReturn(consumer);

        TopicPartition tp0 = new TopicPartition("my-topic", 0);
        TopicPartition tp1 = new TopicPartition("my-topic", 1);
        when(consumer.partitionsFor("my-topic")).thenReturn(List.of(
                new PartitionInfo("my-topic", 0, null, null, null),
                new PartitionInfo("my-topic", 1, null, null, null)
        ));
        when(consumer.position(tp0)).thenReturn(50L);
        when(consumer.position(tp1)).thenReturn(30L);

        ConsumerRecord<String, String> older = new ConsumerRecord<>("my-topic", 0, 48, 1000L,
                TimestampType.CREATE_TIME, 0, 0, "k1", "old", new RecordHeaders(), null);
        ConsumerRecord<String, String> newer = new ConsumerRecord<>("my-topic", 1, 28, 2000L,
                TimestampType.CREATE_TIME, 0, 0, "k2", "new", new RecordHeaders(), null);

        ConsumerRecords<String, String> records = new ConsumerRecords<>(Map.of(
                tp0, List.of(older),
                tp1, List.of(newer)
        ));
        when(consumer.poll(any(Duration.class))).thenReturn(records, ConsumerRecords.empty());

        List<KafkaMessageDto> result = service.fetchLatest("conn1", "my-topic", 10, null);

        assertEquals(2, result.size());
        assertEquals("new", result.get(0).value());
        assertEquals("old", result.get(1).value());

        // limit=10, 2 partitions → ceil(10/2) = 5 per partition
        verify(consumer).seek(tp0, 45L);
        verify(consumer).seek(tp1, 25L);
    }

    @Test
    void shouldFetchMessagesBeforeTimestamp() {
        KafkaConsumer<String, String> consumer = mock(KafkaConsumer.class);
        when(producerManager.createStreamingConsumer("conn1", "latest")).thenReturn(consumer);

        TopicPartition tp0 = new TopicPartition("my-topic", 0);
        when(consumer.partitionsFor("my-topic")).thenReturn(List.of(
                new PartitionInfo("my-topic", 0, null, null, null)
        ));

        Instant cursor = Instant.ofEpochMilli(2000);
        when(consumer.offsetsForTimes(Map.of(tp0, 2000L)))
                .thenReturn(Map.of(tp0, new OffsetAndTimestamp(50, 2000L)));
        when(consumer.position(tp0)).thenReturn(100L);

        ConsumerRecord<String, String> before = new ConsumerRecord<>("my-topic", 0, 48, 1500L,
                TimestampType.CREATE_TIME, 0, 0, "k1", "older", new RecordHeaders(), null);
        ConsumerRecord<String, String> atCursor = new ConsumerRecord<>("my-topic", 0, 50, 2000L,
                TimestampType.CREATE_TIME, 0, 0, "k2", "at-cursor", new RecordHeaders(), null);

        ConsumerRecords<String, String> records = new ConsumerRecords<>(Map.of(
                tp0, List.of(before, atCursor)
        ));
        when(consumer.poll(any(Duration.class))).thenReturn(records, ConsumerRecords.empty());

        List<KafkaMessageDto> result = service.fetchLatest("conn1", "my-topic", 10, cursor);

        assertEquals(1, result.size());
        assertEquals("older", result.getFirst().value());
        verify(consumer).seek(tp0, 40L);
    }

    @Test
    void shouldDistributeLimitAcrossPartitionsInSeekFromEnd() {
        KafkaConsumer<String, String> consumer = mock(KafkaConsumer.class);
        when(producerManager.createStreamingConsumer("conn1", "latest")).thenReturn(consumer);

        TopicPartition tp0 = new TopicPartition("my-topic", 0);
        TopicPartition tp1 = new TopicPartition("my-topic", 1);
        TopicPartition tp2 = new TopicPartition("my-topic", 2);
        when(consumer.partitionsFor("my-topic")).thenReturn(List.of(
                new PartitionInfo("my-topic", 0, null, null, null),
                new PartitionInfo("my-topic", 1, null, null, null),
                new PartitionInfo("my-topic", 2, null, null, null)
        ));
        when(consumer.position(tp0)).thenReturn(1000L);
        when(consumer.position(tp1)).thenReturn(1000L);
        when(consumer.position(tp2)).thenReturn(1000L);

        when(consumer.poll(any(Duration.class))).thenReturn(ConsumerRecords.empty());

        service.fetchLatest("conn1", "my-topic", 30, null);

        // limit=30, 3 partitions → ceil(30/3) = 10 per partition
        verify(consumer).seek(tp0, 990L);
        verify(consumer).seek(tp1, 990L);
        verify(consumer).seek(tp2, 990L);
    }

    @Test
    void shouldDistributeLimitAcrossPartitionsInSeekBeforeTimestamp() {
        KafkaConsumer<String, String> consumer = mock(KafkaConsumer.class);
        when(producerManager.createStreamingConsumer("conn1", "latest")).thenReturn(consumer);

        TopicPartition tp0 = new TopicPartition("my-topic", 0);
        TopicPartition tp1 = new TopicPartition("my-topic", 1);
        when(consumer.partitionsFor("my-topic")).thenReturn(List.of(
                new PartitionInfo("my-topic", 0, null, null, null),
                new PartitionInfo("my-topic", 1, null, null, null)
        ));

        Instant cursor = Instant.ofEpochMilli(5000);
        when(consumer.offsetsForTimes(Map.of(tp0, 5000L, tp1, 5000L)))
                .thenReturn(Map.of(
                        tp0, new OffsetAndTimestamp(100, 5000L),
                        tp1, new OffsetAndTimestamp(200, 5000L)
                ));
        when(consumer.position(tp0)).thenReturn(150L);
        when(consumer.position(tp1)).thenReturn(250L);

        when(consumer.poll(any(Duration.class))).thenReturn(ConsumerRecords.empty());

        service.fetchLatest("conn1", "my-topic", 20, cursor);

        // limit=20, 2 partitions → ceil(20/2) = 10 per partition
        verify(consumer).seek(tp0, 90L);
        verify(consumer).seek(tp1, 190L);
    }

    @Test
    void shouldReturnEmptyListWhenPartitionsForReturnsNull() {
        KafkaConsumer<String, String> consumer = mock(KafkaConsumer.class);
        when(producerManager.createStreamingConsumer("conn1", "latest")).thenReturn(consumer);
        when(consumer.partitionsFor("unknown-topic")).thenReturn(null);

        List<KafkaMessageDto> result = service.fetchLatest("conn1", "unknown-topic", 10, null);

        assertTrue(result.isEmpty());
        verify(consumer).close();
    }

    @Test
    void shouldListTopicsFromBroker() {
        KafkaConsumer<String, String> consumer = mock(KafkaConsumer.class);
        when(producerManager.createStreamingConsumer("conn1", "latest")).thenReturn(consumer);

        Map<String, List<PartitionInfo>> topicMap = new LinkedHashMap<>();
        topicMap.put("topic-a", List.of());
        topicMap.put("topic-b", List.of());
        topicMap.put("__consumer_offsets", List.of());
        when(consumer.listTopics()).thenReturn(topicMap);

        Set<String> result = service.listTopics("conn1");

        assertEquals(Set.of("topic-a", "topic-b", "__consumer_offsets"), result);
        verify(consumer).close();
    }
}
