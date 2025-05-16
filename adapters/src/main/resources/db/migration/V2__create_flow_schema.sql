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

-- Flyway migration script for Flow management with UUID IDs
-- Filename suggestion: V1__create_flow_schema.sql

CREATE TABLE flow_definition
(
    id                VARCHAR(36) PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    provider          VARCHAR(255) NOT NULL,
    provider_metadata TEXT         NOT NULL DEFAULT '{}'
);

CREATE TABLE flow_node
(
    id                 VARCHAR(36) PRIMARY KEY,
    flow_definition_id VARCHAR(36) NOT NULL,
    type               VARCHAR(50) NOT NULL,
    position_x         DOUBLE      NOT NULL,
    position_y         DOUBLE      NOT NULL,
    schema_id          VARCHAR(255),
    CONSTRAINT fk_node_flow_definition FOREIGN KEY (flow_definition_id)
        REFERENCES flow_definition (id) ON DELETE CASCADE
);

CREATE TABLE flow_connection
(
    id                 VARCHAR(36) PRIMARY KEY,
    flow_definition_id VARCHAR(36) NOT NULL,
    source_id          VARCHAR(36) NOT NULL,
    target_id          VARCHAR(36) NOT NULL,
    CONSTRAINT fk_connection_flow_definition FOREIGN KEY (flow_definition_id)
        REFERENCES flow_definition (id) ON DELETE CASCADE,
    CONSTRAINT fk_connection_source FOREIGN KEY (source_id)
        REFERENCES flow_node (id) ON DELETE CASCADE,
    CONSTRAINT fk_connection_target FOREIGN KEY (target_id)
        REFERENCES flow_node (id) ON DELETE CASCADE
);

CREATE TABLE flow_rule
(
    id                 VARCHAR(36) PRIMARY KEY,
    schema_id          VARCHAR(36) NOT NULL,
    flow_definition_id VARCHAR(36) NOT NULL,
    node_id            VARCHAR(36) NOT NULL,
    global_tick_millis INT         NOT NULL,
    CONSTRAINT fk_rule_node FOREIGN KEY (node_id)
        REFERENCES flow_node (id) ON DELETE CASCADE
);

CREATE TABLE field_rule
(
    id            VARCHAR(36) PRIMARY KEY,
    field_name    VARCHAR(255) NOT NULL,
    type          VARCHAR(255) NOT NULL,
    default_value VARCHAR(255) NOT NULL,
    increment     INT          NOT NULL,
    repetitions   INT          NOT NULL,
    flow_rule_id  VARCHAR(36)  NOT NULL,
    CONSTRAINT fk_field_rule_flow_rule FOREIGN KEY (flow_rule_id)
        REFERENCES flow_rule (id) ON DELETE CASCADE
);