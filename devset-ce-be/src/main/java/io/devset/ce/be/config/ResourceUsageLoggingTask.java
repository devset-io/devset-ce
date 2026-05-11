/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.config;

import com.sun.management.OperatingSystemMXBean;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.util.Locale;

/**
 * Scheduled task that periodically logs CPU and memory usage metrics.
 * Activated only when {@code devset.monitoring.resources.enabled} is set to {@code true}.
 */
@Component
@Slf4j
@ConditionalOnProperty(prefix = "devset.monitoring.resources", name = "enabled", havingValue = "true")
public final class ResourceUsageLoggingTask {

    private static final long MEBIBYTE = 1024L * 1024L;

    private final OperatingSystemMXBean operatingSystemMXBean;
    private final MemoryMXBean memoryMXBean;

    public ResourceUsageLoggingTask() {
        this.operatingSystemMXBean = ManagementFactory.getPlatformMXBean(OperatingSystemMXBean.class);
        this.memoryMXBean = ManagementFactory.getMemoryMXBean();
    }

    @Scheduled(
            fixedDelayString = "${devset.monitoring.resources.interval-ms:30000}",
            initialDelayString = "${devset.monitoring.resources.initial-delay-ms:10000}"
    )
    void logResourceUsage() {
        if (operatingSystemMXBean == null) {
            log.warn("Resource monitor unavailable: OS bean not provided by current JVM");
            return;
        }

        MemoryUsage heap = memoryMXBean.getHeapMemoryUsage();
        MemoryUsage nonHeap = memoryMXBean.getNonHeapMemoryUsage();

        long heapUsedBytes = Math.max(0L, heap.getUsed());
        long heapMaxBytes = heap.getMax();
        long jvmUsedBytes = heapUsedBytes + Math.max(0L, nonHeap.getUsed());

        long systemTotalBytes = Math.max(0L, operatingSystemMXBean.getTotalMemorySize());
        long systemFreeBytes = Math.max(0L, operatingSystemMXBean.getFreeMemorySize());
        long systemUsedBytes = Math.max(0L, systemTotalBytes - systemFreeBytes);

        log.info(
                "Resource usage: cpu(process={}, system={}), ram(jvm={} MiB, heap={} MiB/{} MiB, system={} MiB/{} MiB, systemUsed={})",
                percent(operatingSystemMXBean.getProcessCpuLoad()),
                percent(operatingSystemMXBean.getCpuLoad()),
                toMiB(jvmUsedBytes),
                toMiB(heapUsedBytes),
                heapMaxBytes < 0 ? "unbounded" : toMiB(heapMaxBytes),
                toMiB(systemUsedBytes),
                toMiB(systemTotalBytes),
                systemTotalBytes == 0 ? "n/a" : percent((double) systemUsedBytes / systemTotalBytes)
        );
    }

    private long toMiB(long bytes) {
        return bytes / MEBIBYTE;
    }

    private String percent(double ratio) {
        if (ratio < 0) {
            return "n/a";
        }
        return String.format(Locale.ROOT, "%.1f%%", ratio * 100.0);
    }
}
