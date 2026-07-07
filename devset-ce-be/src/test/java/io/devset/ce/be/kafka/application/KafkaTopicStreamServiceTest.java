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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.header.internals.RecordHeaders;
import org.apache.kafka.common.record.TimestampType;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("unchecked")
class KafkaTopicStreamServiceTest {

    private final DynamicKafkaProducerManager producerManager = mock(DynamicKafkaProducerManager.class);
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final KafkaTopicStreamService service = new KafkaTopicStreamService(producerManager, objectMapper);

    @Test
    void shouldSendConnectedEventAndStreamRecords() throws Exception {
        KafkaConsumer<String, String> consumer = mock(KafkaConsumer.class);
        when(producerManager.createStreamingConsumer("conn1", "latest")).thenReturn(consumer);

        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn("ws-1");
        when(session.isOpen()).thenReturn(true);

        RecordHeaders headers = new RecordHeaders();
        headers.add("trace-id", "abc".getBytes(StandardCharsets.UTF_8));
        ConsumerRecord<String, String> record = new ConsumerRecord<>("orders", 0, 7, 1000L,
                TimestampType.CREATE_TIME, 0, 0, "key-1", "{\"id\":1}", headers, null);
        ConsumerRecords<String, String> records =
                new ConsumerRecords<>(Map.of(new TopicPartition("orders", 0), List.of(record)));
        when(consumer.poll(any(Duration.class))).thenReturn(records).thenReturn(ConsumerRecords.empty());

        service.startStream(session, "conn1", "orders", "latest");

        ArgumentCaptor<TextMessage> messages = ArgumentCaptor.forClass(TextMessage.class);
        verify(session, timeout(2000).atLeast(2)).sendMessage(messages.capture());

        String connectedEvent = messages.getAllValues().getFirst().getPayload();
        assertTrue(connectedEvent.contains("\"type\":\"connected\""));
        assertTrue(connectedEvent.contains("\"topic\":\"orders\""));

        String messageEvent = messages.getAllValues().get(1).getPayload();
        assertTrue(messageEvent.contains("\"type\":\"message\""));
        assertTrue(messageEvent.contains("\"key\":\"key-1\""));
        assertTrue(messageEvent.contains("\"trace-id\":\"abc\""));
        assertTrue(messageEvent.contains("{\\\"id\\\":1}"));

        service.stopStream(session);
        verify(consumer, timeout(2000)).close();
        verify(consumer).subscribe(List.of("orders"));
    }

    @Test
    void shouldSendErrorEventAndCloseSessionWhenPollFails() throws Exception {
        KafkaConsumer<String, String> consumer = mock(KafkaConsumer.class);
        when(producerManager.createStreamingConsumer("conn1", "earliest")).thenReturn(consumer);

        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn("ws-2");
        when(session.isOpen()).thenReturn(true);
        when(consumer.poll(any(Duration.class))).thenThrow(new IllegalStateException("boom"));

        service.startStream(session, "conn1", "orders", "earliest");

        ArgumentCaptor<TextMessage> messages = ArgumentCaptor.forClass(TextMessage.class);
        verify(session, timeout(2000).times(2)).sendMessage(messages.capture());
        String errorEvent = messages.getAllValues().get(1).getPayload();
        assertTrue(errorEvent.contains("\"type\":\"error\""));
        assertTrue(errorEvent.contains("boom"));

        verify(session, timeout(2000)).close(CloseStatus.SERVER_ERROR);
        verify(consumer, timeout(2000)).close();
    }

    @Test
    void shouldNotSendEventsWhenSessionAlreadyClosed() throws Exception {
        KafkaConsumer<String, String> consumer = mock(KafkaConsumer.class);
        when(producerManager.createStreamingConsumer("conn1", "latest")).thenReturn(consumer);

        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn("ws-3");
        when(session.isOpen()).thenReturn(false);

        service.startStream(session, "conn1", "orders", "latest");

        verify(consumer, timeout(2000)).close();
        verify(session, never()).sendMessage(any());
    }

    @Test
    void shouldIgnoreStopForUnknownSession() {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn("ws-unknown");

        service.stopStream(session);

        verify(session, never()).isOpen();
    }
}
