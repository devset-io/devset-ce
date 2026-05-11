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

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point for the Devset CE backend application.
 * Bootstraps Spring Boot with scheduling, caching, and JPA repository scanning.
 */
@SpringBootApplication(scanBasePackages = "io.devset.ce.be", exclude = MongoAutoConfiguration.class)
@EnableScheduling
@EnableCaching
@EntityScan(basePackages = "io.devset.ce.be")
@EnableJpaRepositories(basePackages = "io.devset.ce.be")
public class DevsetCeBeApplication {

	public static void main(String[] args) {
		SpringApplication.run(DevsetCeBeApplication.class, args);
	}

}
