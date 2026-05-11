/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.rabbit.api;

import io.devset.ce.be.rabbit.application.RabbitFacade;
import io.devset.ce.be.rabbit.application.dto.RabbitSendMessageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for direct RabbitMQ message publishing.
 * Delegates ALL logic to {@link RabbitFacade}.
 */
@RestController("rabbitSendMessageController")
@RequestMapping("/rabbit/message")
@RequiredArgsConstructor
public class SendMessageController {

    private final RabbitFacade rabbitFacade;

    /**
     * Publishes a message to RabbitMQ.
     *
     * @param request payload with producer name, queue/exchange/routing key and message body
     */
    @PostMapping("send")
    public void send(@RequestBody RabbitSendMessageDto request) {
        rabbitFacade.send(request);
    }
}
