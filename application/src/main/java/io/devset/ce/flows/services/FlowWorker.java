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

import io.devset.ce.flows.services.strategies.AbstractFlowStrategy;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class FlowWorker implements Runnable {

    private final String id;
    @Getter
    private volatile boolean running = true;
    private final AbstractFlowStrategy flowStrategy;


    public FlowWorker(String id, AbstractFlowStrategy flowStrategy) {
        this.id = id;
        this.flowStrategy = flowStrategy;

    }

    public void stop() {
        log.info("[UI] STOP worker id [{}]", id);
        running = false;
    }

    @Override
    public void run() {
        var context = flowStrategy.getContext();
        log.debug("Worker [{}] started", context);

        try {
            while (running && flowStrategy.execute()) {
                sleepSafely(context.getTickIntervalMillis());
            }
        } catch (Exception e) {
            log.error("Unexpected exception in worker [{}]: {}", context, e.getMessage(), e);
        } finally {
            running = false;
            log.debug("Worker [{}] finished", context);
        }
    }

    private void sleepSafely(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Worker thread interrupted during sleep");
        }
    }

}