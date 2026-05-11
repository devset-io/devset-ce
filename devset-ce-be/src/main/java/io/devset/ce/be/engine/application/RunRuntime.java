/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application;

import io.devset.ce.be.engine.domain.ExecutionPlanResult;

import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Mutable runtime handle for a single execution plan run.
 * <p>
 * Tracks submitted, active, completed and failed execution counts with atomic
 * counters and supports cooperative stop signalling with task cancellation.
 * All mutable fields use atomic or volatile access to guarantee visibility
 * across the virtual threads that share this handle.
 */
public final class RunRuntime {
    private final AtomicBoolean stopRequested = new AtomicBoolean(false);
    private final AtomicInteger submittedExecutions = new AtomicInteger(0);
    private final AtomicInteger activeExecutionTasks = new AtomicInteger(0);
    private final AtomicInteger completed = new AtomicInteger(0);
    private final AtomicInteger failed = new AtomicInteger(0);
    private final CopyOnWriteArrayList<Future<ExecutionPlanResult>> executionTasks = new CopyOnWriteArrayList<>();
    private final Object activeExecutionTasksMonitor = new Object();
    private volatile String firstErrorMessage;

    /**
     * Returns whether a stop has been requested for this run.
     *
     * @return {@code true} if stop was requested
     */
    public boolean isStopRequested() {
        return stopRequested.get();
    }

    /**
     * Signals a stop request and cancels all tracked execution task futures.
     */
    public void requestStopAndCancel() {
        stopRequested.set(true);
        executionTasks.forEach(future -> future.cancel(true));
    }

    /**
     * Atomically increments and returns the submitted execution count.
     *
     * @return the new submitted execution count
     */
    public int incrementSubmittedExecutions() {
        return submittedExecutions.incrementAndGet();
    }

    /**
     * Returns the current number of submitted executions.
     *
     * @return the submitted execution count
     */
    public int submittedExecutions() {
        return submittedExecutions.get();
    }

    /**
     * Registers an execution task future so it can be cancelled on stop.
     *
     * @param executionTask the future representing a single execution
     */
    public void addExecutionTask(Future<ExecutionPlanResult> executionTask) {
        executionTasks.add(executionTask);
    }

    /**
     * Increments the active execution task counter. Called when a task begins running.
     */
    public void markExecutionTaskStarted() {
        activeExecutionTasks.incrementAndGet();
    }

    /**
     * Decrements the active execution task counter and notifies waiting threads
     * when no active tasks remain.
     */
    public void markExecutionTaskFinished() {
        int remaining = activeExecutionTasks.decrementAndGet();
        if (remaining <= 0) {
            synchronized (activeExecutionTasksMonitor) {
                activeExecutionTasksMonitor.notifyAll();
            }
        }
    }

    /**
     * Returns the number of currently active (in-progress) execution tasks.
     *
     * @return the active task count, never negative
     */
    public int activeExecutionTasks() {
        return Math.max(activeExecutionTasks.get(), 0);
    }

    /**
     * Blocks the calling thread until all active execution tasks have finished.
     * Returns immediately if the thread is interrupted while waiting.
     */
    public void awaitNoActiveExecutionTasks() {
        synchronized (activeExecutionTasksMonitor) {
            while (activeExecutionTasks.get() > 0) {
                try {
                    activeExecutionTasksMonitor.wait(100L);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }

    /** Atomically increments the completed execution count. */
    public void incrementCompleted() {
        completed.incrementAndGet();
    }

    /** Returns the current completed execution count. */
    public int completed() {
        return completed.get();
    }

    /** Atomically increments the failed execution count. */
    public void incrementFailed() {
        failed.incrementAndGet();
    }

    /** Returns the current failed execution count. */
    public int failed() {
        return failed.get();
    }

    /** Returns the first captured error message, or {@code null} if no error occurred. */
    public String firstErrorMessage() {
        return firstErrorMessage;
    }

    /**
     * Stores the error message only if no previous error has been recorded.
     * Uses volatile read/write; benign race under concurrent calls—at most
     * one message wins.
     */
    public void setFirstErrorMessageIfAbsent(String firstErrorMessage) {
        if (this.firstErrorMessage == null) {
            this.firstErrorMessage = firstErrorMessage;
        }
    }
}
