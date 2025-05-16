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

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.AppenderBase;

import java.util.function.Consumer;

public class UiLogAppender extends AppenderBase<ILoggingEvent> {

    private static Consumer<String> logConsumer;

    public static void setLogConsumer(Consumer<String> consumer) {
        logConsumer = consumer;
    }

    @Override
    protected void append(ILoggingEvent eventObject) {
        // tutaj log trafia do TextArea w UI
        if (logConsumer != null && shouldSendToUI(eventObject)) {
            logConsumer.accept(eventObject.getFormattedMessage());
        }
    }

    private boolean shouldSendToUI(ILoggingEvent event) {
        return event.getLevel() == Level.INFO && event.getFormattedMessage().contains("[UI]");
    }
}
